import { GoogleGenAI } from '@google/genai';

export interface AnalysisResult {
  summary: string;
  todos: {
    text: string;
    assignee: string;
    deadline: string;
  }[];
  decisions: {
    text: string;
    decidedBy: string;
  }[];
}

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

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('VITE_GEMINI_API_KEY が設定されていません。.env.local を確認してください。');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function analyzeTranscript(transcriptText: string): Promise<AnalysisResult> {
  const ai = getClient();

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

  // Strip possible code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const parsed: AnalysisResult = JSON.parse(cleaned);
  return parsed;
}
