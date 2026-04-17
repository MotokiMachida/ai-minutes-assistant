import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';

// Increase body size limit — audio base64 can exceed Vercel's 1MB default
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

function base64ByteSize(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

async function buildAudioPart(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string,
): Promise<[Part, () => Promise<void>]> {
  const baseMime = mimeType.split(';')[0];
  const rawBytes = base64ByteSize(audioBase64);
  const INLINE_LIMIT = 10 * 1024 * 1024;

  if (rawBytes < INLINE_LIMIT) {
    const part: Part = { inlineData: { mimeType, data: audioBase64 } };
    return [part, async () => {}];
  }

  console.info(`[transcribe] Large audio (${(rawBytes / 1024 / 1024).toFixed(1)} MB) — uploading via Files API`);

  const buffer = Buffer.from(audioBase64, 'base64');
  const blob = new Blob([buffer], { type: baseMime });

  const uploadResult = await ai.files.upload({
    file: blob,
    config: { mimeType: baseMime },
  });

  if (!uploadResult.uri || !uploadResult.name) {
    throw new Error('Files API upload failed: no uri/name returned');
  }

  const part: Part = { fileData: { mimeType: baseMime, fileUri: uploadResult.uri } };
  const name = uploadResult.name;

  const cleanup = async () => {
    try {
      await ai.files.delete({ name });
    } catch (e) {
      console.warn('[transcribe] Failed to delete uploaded file:', e);
    }
  };

  return [part, cleanup];
}

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

  const ai = new GoogleGenAI({ apiKey });
  let cleanup: () => Promise<void> = async () => {};

  try {
    const [audioPart, cleanupFn] = await buildAudioPart(ai, audioBase64, mimeType);
    cleanup = cleanupFn;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            audioPart,
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
    const httpStatus = typeof (err as Record<string, unknown>).status === 'number'
      ? (err as Record<string, unknown>).status as number
      : 500;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(httpStatus).json({ error: message });
  } finally {
    await cleanup();
  }
}
