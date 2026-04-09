import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysis } from '../useAnalysis';

vi.mock('../../services/gemini', () => ({
  analyzeTranscript: vi.fn(),
}));

import { analyzeTranscript } from '../../services/gemini';
const mockAnalyze = analyzeTranscript as ReturnType<typeof vi.fn>;

const SAMPLE_RESULT = {
  summary: 'テスト要約',
  todos: [{ text: 'タスク1', assignee: '佐藤', deadline: '今週' }],
  decisions: [{ text: '決定1', decidedBy: '田中' }],
};

beforeEach(() => {
  mockAnalyze.mockReset();
});

describe('useAnalysis', () => {
  it('初期状態は idle', () => {
    const { result } = renderHook(() => useAnalysis());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('analyze 成功時に status が success になり結果が入る', async () => {
    mockAnalyze.mockResolvedValueOnce(SAMPLE_RESULT);

    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.analyze('文字起こしテキスト');
    });

    expect(result.current.status).toBe('success');
    expect(result.current.result?.summary).toBe('テスト要約');
    expect(result.current.result?.todos).toHaveLength(1);
    expect(result.current.result?.decisions).toHaveLength(1);
    expect(result.current.errorMessage).toBeNull();
  });

  it('analyze 中は status が loading になる', async () => {
    let resolve!: (v: typeof SAMPLE_RESULT) => void;
    mockAnalyze.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useAnalysis());

    act(() => { result.current.analyze('テキスト'); });
    expect(result.current.status).toBe('loading');

    await act(async () => { resolve(SAMPLE_RESULT); });
    expect(result.current.status).toBe('success');
  });

  it('analyze 失敗時に status が error になりメッセージが入る', async () => {
    mockAnalyze.mockRejectedValueOnce(new Error('APIエラー'));

    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.analyze('テキスト');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('APIエラー');
    expect(result.current.result).toBeNull();
  });

  it('空テキストのとき analyze は何もしない', async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.analyze('   ');
    });

    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('reset で状態が初期化される', async () => {
    mockAnalyze.mockResolvedValueOnce(SAMPLE_RESULT);

    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.analyze('テキスト');
    });
    expect(result.current.status).toBe('success');

    act(() => { result.current.reset(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });
});
