import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

  const { transcriptText } = req.body as { transcriptText?: string };
  if (!transcriptText) {
    return res.status(400).json({ error: 'transcriptText is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n---\n\n${transcriptText}` }],
        },
      ],
    });

    const raw = response.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[/api/analyze]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
