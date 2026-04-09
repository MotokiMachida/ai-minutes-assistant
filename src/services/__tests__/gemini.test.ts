import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted で先に mock 関数を定義してから vi.mock に渡す
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  // class 構文でコンストラクタとして使える形に
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key-dummy');

// mock 設定後にインポート
import { analyzeTranscript } from '../gemini';

beforeEach(() => {
  mockGenerateContent.mockReset();
});

describe('analyzeTranscript', () => {
  it('正常なJSONレスポンスをパースして返す', async () => {
    const mockResult = {
      summary: '会議の要約です。',
      todos: [{ text: 'タスクA', assignee: '田中', deadline: '来週' }],
      decisions: [{ text: '決定事項A', decidedBy: '全員' }],
    };
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(mockResult) });

    const result = await analyzeTranscript('テスト用の文字起こしテキスト');

    expect(result.summary).toBe('会議の要約です。');
    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].assignee).toBe('田中');
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].decidedBy).toBe('全員');
  });

  it('コードフェンス付きレスポンスも正しくパースする', async () => {
    const mockResult = { summary: 'フェンス付きテスト', todos: [], decisions: [] };
    const fenced = '```json\n' + JSON.stringify(mockResult) + '\n```';
    mockGenerateContent.mockResolvedValueOnce({ text: fenced });

    const result = await analyzeTranscript('テキスト');

    expect(result.summary).toBe('フェンス付きテスト');
    expect(result.todos).toHaveLength(0);
  });

  it('不正なJSONのときはエラーをスローする', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'これはJSONではありません' });

    await expect(analyzeTranscript('テキスト')).rejects.toThrow();
  });

  it('APIキー未設定のときはエラーをスローする', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'your_api_key_here');
    vi.resetModules();
    const { analyzeTranscript: fresh } = await import('../gemini');

    await expect(fresh('テキスト')).rejects.toThrow('VITE_GEMINI_API_KEY');

    // テスト後に元に戻す
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key-dummy');
    vi.resetModules();
  });
});
