import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioBase64, mimeType } = req.body as { audioBase64?: string; mimeType?: string };
  if (!audioBase64 || !mimeType) {
    return res.status(400).json({ error: 'audioBase64 and mimeType are required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const baseMime = mimeType.split(';')[0];

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: baseMime, data: audioBase64 } },
            {
              text: 'この音声を日本語で正確に文字起こしししてください。話された日本語の内容のみを返してください。音声がない・無音・聞き取れない場合は必ず空文字のみを返してください。余計な説明や補足は不要です。',
            },
          ],
        },
      ],
    });

    return res.status(200).json({ text: (response.text ?? '').trim() });
  } catch (err) {
    console.error('[/api/transcribe]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
