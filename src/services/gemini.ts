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

export async function analyzeTranscript(transcriptText: string): Promise<AnalysisResult> {
  return apiPost<AnalysisResult>('/api/analyze', { transcriptText });
}
