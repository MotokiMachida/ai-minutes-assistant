import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';

/**
 * base64 文字列のバイト換算サイズ（バイト）
 * base64 は元データの約 4/3 倍なので逆算
 */
function base64ByteSize(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/**
 * 音声データを Gemini に渡すための Part を返す。
 *
 * - 10 MB 未満: inlineData（そのまま埋め込み）
 * - 10 MB 以上: Files API でアップロードし fileData を返す
 *
 * @returns [audioPart, cleanupFn]
 *   cleanupFn を呼ぶと Files API にアップロードしたファイルを削除する（inlineData の場合は no-op）
 */
export async function buildAudioPart(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string,
): Promise<[Part, () => Promise<void>]> {
  const baseMime = mimeType.split(';')[0];
  const rawBytes = base64ByteSize(audioBase64);
  const INLINE_LIMIT = 10 * 1024 * 1024; // 10 MB

  if (rawBytes < INLINE_LIMIT) {
    const part: Part = { inlineData: { mimeType: baseMime, data: audioBase64 } };
    return [part, async () => {}];
  }

  // Files API を使ってアップロード
  console.info(`[gemini-audio] Large audio (${(rawBytes / 1024 / 1024).toFixed(1)} MB) — uploading via Files API`);

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
      console.warn('[gemini-audio] Failed to delete uploaded file:', e);
    }
  };

  return [part, cleanup];
}
