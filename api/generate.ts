import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
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

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const { transcriptText } = (await req.json()) as { transcriptText?: string };
  if (!transcriptText) {
    return new Response(JSON.stringify({ error: 'transcriptText is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n---\n\n${transcriptText}` }],
        },
      ],
    });

    const raw = response.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error('[/api/generate]', err);
    const httpStatus =
      typeof (err as Record<string, unknown>).status === 'number'
        ? ((err as Record<string, unknown>).status as number)
        : 500;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: httpStatus,
      headers: JSON_HEADERS,
    });
  }
}
