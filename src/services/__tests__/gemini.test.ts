import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeAudio, analyzeTranscript } from '../gemini';

// ---------- fetch mock ----------
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOk(body: unknown) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchError(status: number, error: string) {
  vi.mocked(fetch).mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  } as Response);
}

// ---------- transcribeAudio ----------
describe('transcribeAudio', () => {
  it('POST /api/transcribe を呼び出して text を返す', async () => {
    mockFetchOk({ text: 'こんにちは' });

    const result = await transcribeAudio('base64data', 'audio/webm');

    expect(fetch).toHaveBeenCalledWith('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'base64data', mimeType: 'audio/webm' }),
    });
    expect(result).toBe('こんにちは');
  });

  it('サーバーエラー時はエラーメッセージをスローする', async () => {
    mockFetchError(500, '音声処理に失敗しました');

    await expect(transcribeAudio('base64data', 'audio/webm')).rejects.toThrow('音声処理に失敗しました');
  });

  it('429 Too Many Requests の場合もエラーをスローする', async () => {
    mockFetchError(429, 'Rate limit exceeded');

    await expect(transcribeAudio('base64data', 'audio/webm')).rejects.toThrow('Rate limit exceeded');
  });
});

// ---------- analyzeTranscript ----------
describe('analyzeTranscript', () => {
  it('POST /api/analyze を呼び出して AnalysisResult を返す', async () => {
    const mockResult = {
      summary: '会議の要約です。',
      todos: [{ text: 'タスクA', assignee: '田中', deadline: '来週' }],
      decisions: [{ text: '決定事項A', decidedBy: '全員' }],
    };
    mockFetchOk(mockResult);

    const result = await analyzeTranscript('テスト用の文字起こしテキスト');

    expect(fetch).toHaveBeenCalledWith('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptText: 'テスト用の文字起こしテキスト' }),
    });
    expect(result.summary).toBe('会議の要約です。');
    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].assignee).toBe('田中');
    expect(result.decisions[0].decidedBy).toBe('全員');
  });

  it('サーバーエラー時はエラーをスローする', async () => {
    mockFetchError(500, 'Internal server error');

    await expect(analyzeTranscript('テキスト')).rejects.toThrow('Internal server error');
  });

  it('fetch 自体が失敗した場合もエラーをスローする', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    await expect(analyzeTranscript('テキスト')).rejects.toThrow('Network error');
  });
});
