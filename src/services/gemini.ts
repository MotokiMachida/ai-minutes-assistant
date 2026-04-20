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

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const { text } = await apiPost<{ text: string }>('/api/transcribe', { audioBase64, mimeType });
  return text;
}

export async function analyzeTranscript(transcriptText: string, meetingTitle?: string): Promise<AnalysisResult> {
  return apiPost<AnalysisResult>('/api/generate', { transcriptText, meetingTitle: meetingTitle || undefined });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]); // data:audio/webm;base64,<here>
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface AudioAnalysisResult extends AnalysisResult {
  transcript: string;
}

export async function analyzeAudio(blob: Blob, meetingTitle?: string): Promise<AudioAnalysisResult> {
  console.info('[analyzeAudio] blob.type:', blob.type, '| size:', blob.size);
  const audioBase64 = await blobToBase64(blob);
  return apiPost<AudioAnalysisResult>('/api/analyze-audio', {
    audioBase64,
    mimeType: blob.type || 'audio/webm',
    meetingTitle: meetingTitle || undefined,
  });
}

/**
 * 大容量音声を Vercel Blob 経由で送信して分析する。
 * クライアントがブラウザから直接 Vercel Blob CDN にアップロードするため
 * Vercel の 4.5MB インフラ上限を回避できる。
 * サーバー側は Blob URL を受け取り Gemini Files API に転送する（API 呼び出し 1 回）。
 */
export async function analyzeAudioLarge(
  blob: Blob,
  meetingTitle?: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<AudioAnalysisResult> {
  const { put } = await import('@vercel/blob/client');
  const ext = (blob.type.split('/')[1] ?? 'webm').split(';')[0];
  const filename = `audio-${Date.now()}.${ext}`;

  // Step 1: サーバーからクライアントトークンを取得
  const { clientToken } = await apiPost<{ clientToken: string }>('/api/blob-upload', { pathname: filename });

  // Step 2: トークンを使って Vercel Blob CDN へ直接アップロード
  const uploaded = await put(filename, blob, {
    access: 'public',
    token: clientToken,
    multipart: true,
    onUploadProgress: onProgress
      ? ({ loaded, total }: { loaded: number; total: number }) => onProgress(loaded, total)
      : undefined,
  });

  // Step 3: blobUrl をサーバーに渡して Gemini で分析
  return apiPost<AudioAnalysisResult>('/api/analyze-audio', {
    blobUrl: uploaded.url,
    mimeType: blob.type || 'audio/webm',
    meetingTitle: meetingTitle || undefined,
  });
}

// 3MB バイナリ = 約 4MB base64 — Vercel の 4.5MB インフラ上限に対して安全なマージンを確保
const CHUNK_SIZE_BYTES = 3 * 1024 * 1024;

/**
 * 大容量音声をチャンク分割して文字起こし → テキスト結合 → 構造化分析。
 * Vercel インフラの 4.5MB リクエスト上限を回避するために使用する。
 * @param onProgress (current, total) — 1-indexed で現在処理中のチャンク番号を通知
 */
export async function analyzeAudioChunked(
  blob: Blob,
  meetingTitle?: string,
  onProgress?: (current: number, total: number) => void,
): Promise<AudioAnalysisResult> {
  const mimeType = blob.type || 'audio/webm';

  // チャンク分割
  const chunks: Blob[] = [];
  for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE_BYTES) {
    chunks.push(blob.slice(offset, offset + CHUNK_SIZE_BYTES));
  }

  // 各チャンクを順次文字起こし（429 レート制限対策のディレイ＋リトライ付き）
  const INTER_CHUNK_DELAY_MS = 2000; // チャンク間の固定ウェイト
  const MAX_RETRIES = 3;

  const transcripts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    // 2チャンク目以降はディレイを挟む
    if (i > 0) await new Promise((r) => setTimeout(r, INTER_CHUNK_DELAY_MS));

    onProgress?.(i + 1, chunks.length);
    const base64 = await blobToBase64(chunks[i]);

    // 429 が来た場合は指数バックオフでリトライ
    let text = '';
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        text = await transcribeAudio(base64, mimeType);
        break;
      } catch (err) {
        const is429 = err instanceof Error && err.message.includes('429');
        if (is429 && attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    if (text.trim()) transcripts.push(text.trim());
  }

  const mergedTranscript = transcripts.join('\n');

  // 結合テキストを構造化分析
  const analysis = await analyzeTranscript(mergedTranscript, meetingTitle);

  return { transcript: mergedTranscript, ...analysis };
}
