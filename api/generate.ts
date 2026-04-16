import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const SYSTEM_PROMPT = `あなたは会議の議事録作成アシスタントです。
与えられた会議の文字起こしテキストを分析し、以下の構造化データを JSON 形式で返してください。

返す JSON のスキーマ:
{
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
- テキストが短すぎる・会議内容でない場合は summary にその旨を記載し、配列は空にしてください。`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcriptText, meetingTitle } = req.body as { transcriptText?: string; meetingTitle?: string };
  if (!transcriptText) {
    return res.status(400).json({ error: 'transcriptText is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  const ai = new GoogleGenAI({ apiKey });

  const MAX_RETRIES = 3;
  let lastErr: unknown;

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
            parts: [{ text: `${SYSTEM_PROMPT}\n\n---\n\n${meetingContext}${transcriptText}` }],
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
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.warn(`[/api/generate] 429 rate limit, retry ${attempt + 1} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error('[/api/generate]', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.status(status).json({ error: message });
    }
  }

  // すべてのリトライが失敗
  console.error('[/api/generate] all retries exhausted', lastErr);
  const message = lastErr instanceof Error ? lastErr.message : 'Unknown error';
  return res.status(429).json({ error: message });
}
