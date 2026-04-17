import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';
import { buildAudioPart } from './_gemini-audio';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const SYSTEM_PROMPT = `あなたは会議の議事録作成アシスタントです。
添付された会議の音声を分析し、以下の構造化データを JSON 形式で返してください。

分析時の指針:
- 音声の波形・話者の声質・話し方から、異なる話者を識別してください
- 各話者に一貫したラベル（「話者A」「話者B」など）を付けてください
- 文脈から話者の名前が推定できる場合は、ラベルの代わりにその名前を使用してください
- 話者が1人だけの場合でも「話者A: 発言内容」の形式で transcript を必ず返してください
- transcript フィールドには「話者ラベル: 発言内容」の形式で全発言を時系列順に記録してください
- transcript は必ず空文字ではなく、聞き取れた内容をすべて含めてください

返す JSON のスキーマ:
{
  "transcript": "話者A: こんにちは、今日の会議を始めます。\n話者B: よろしくお願いします。\n話者A: まず先週の...",
  "summary": "会議内容の簡潔な要約（2〜3文）",
  "todos": [
    {
      "text": "タスクの内容",
      "assignee": "担当者名（不明な場合は「未定」）",
      "deadline": "期限（不明な場合は「未定」）"
    }
  ],
  "decisions": [
    {
      "text": "決定事項の内容",
      "decidedBy": "決定した人・グループ（不明な場合は「全員」）"
    }
  ]
}

注意事項:
- JSON のみを返してください。余計な説明や Markdown コードブロックは不要です。
- タスクや決定事項が見当たらない場合は空配列を返してください。
- 音声が聞き取れない・会議内容でない場合は transcript と summary にその旨を記載し、配列は空にしてください。`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioBase64, mimeType, meetingTitle } = req.body as { audioBase64?: string; mimeType?: string; meetingTitle?: string };
  if (!audioBase64 || !mimeType) {
    return res.status(400).json({ error: 'audioBase64 and mimeType are required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  const ai = new GoogleGenAI({ apiKey });

  // ファイルサイズに応じて inlineData / Files API を選択
  let audioPart: Part;
  let cleanup: () => Promise<void> = async () => {};
  try {
    [audioPart, cleanup] = await buildAudioPart(ai, audioBase64, mimeType);
  } catch (err) {
    console.error('[/api/analyze-audio] audio upload failed', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: `音声の前処理に失敗しました: ${message}` });
  }

  const MAX_RETRIES = 3;
  let lastErr: unknown;

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const meetingContext = meetingTitle?.trim()
          ? `会議名: ${meetingTitle.trim()}\n\n`
          : '';

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: SYSTEM_PROMPT + (meetingContext ? `\n\n${meetingContext}` : '') },
                audioPart,
              ],
            },
          ],
        });

        const raw = response.text ?? '';
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleaned) as unknown;

        return res.status(200).json(parsed);
      } catch (err) {
        lastErr = err;
        const status =
          typeof (err as Record<string, unknown>).status === 'number'
            ? ((err as Record<string, unknown>).status as number)
            : 500;

        if (status === 429 && attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[/api/analyze-audio] 429 rate limit, retry ${attempt + 1} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        console.error('[/api/analyze-audio]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(status).json({ error: message });
      }
    }
  } finally {
    await cleanup();
  }

  const message = lastErr instanceof Error ? lastErr.message : 'Unknown error';
  return res.status(429).json({ error: message });
}
