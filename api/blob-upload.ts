import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pathname } = req.body as { pathname?: string };
  if (!pathname) {
    return res.status(400).json({ error: 'pathname is required' });
  }

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mpeg',
        'audio/mp4',
        'audio/wav',
        'audio/ogg',
        'audio/m4a',
      ],
      maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
      addRandomSuffix: true,
      validUntil: Date.now() + 5 * 60 * 1000, // 5 分
    });

    return res.json({ clientToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/blob-upload]', error);
    return res.status(500).json({ error: message });
  }
}
