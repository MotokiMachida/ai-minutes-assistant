import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '../useSpeechRecognition';

// ---------- Web Speech API mock ----------
interface MockInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((e: unknown) => void) | null;
  onend: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onresult: ((e: unknown) => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

let mockInstance: MockInstance;

// vi.fn(function(){}) — 通常関数を使えばコンストラクタとして new できる
const MockSpeechRecognition = vi.fn(function () {
  mockInstance = {
    lang: '',
    continuous: false,
    interimResults: false,
    maxAlternatives: 1,
    onstart: null,
    onend: null,
    onerror: null,
    onresult: null,
    start: vi.fn(function () { mockInstance.onstart?.({}); }),
    stop: vi.fn(function () { mockInstance.onend?.({}); }),
    abort: vi.fn(),
  };
  return mockInstance;
});

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  });
  // webkitSpeechRecognition を未定義にして SpeechRecognition を優先させる
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: undefined,
    writable: true,
    configurable: true,
  });
  MockSpeechRecognition.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------- helpers ----------
function fireResult(transcript: string, isFinal: boolean) {
  mockInstance.onresult?.({
    resultIndex: 0,
    results: Object.assign(
      { length: 1 },
      { 0: Object.assign({ isFinal, length: 1 }, { 0: { transcript } }) }
    ),
  });
}

function fireError(error: string) {
  mockInstance.onerror?.({ error, message: error });
}

function fireEnd() {
  mockInstance.onend?.({});
}

// ---------- tests ----------
describe('useSpeechRecognition', () => {
  it('初期状態の確認', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isSupported).toBe(true);
    expect(result.current.entries).toHaveLength(0);
    expect(result.current.interimText).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.retryWarning).toBeNull();
  });

  it('startRecording で isRecording が true になる', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    expect(result.current.isRecording).toBe(true);
  });

  it('final な認識結果が entries に追加される', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    act(() => { fireResult('こんにちは', true); });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].text).toBe('こんにちは');
    expect(result.current.entries[0].isFinal).toBe(true);
  });

  it('interim な結果は interimText に反映され entries には入らない', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    act(() => { fireResult('入力中...', false); });

    expect(result.current.interimText).toBe('入力中...');
    expect(result.current.entries).toHaveLength(0);
  });

  it('stopRecording で isRecording が false になる', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    act(() => { result.current.stopRecording(); });
    expect(result.current.isRecording).toBe(false);
  });

  it('clearEntries で entries がリセットされる', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    act(() => { fireResult('テスト発言', true); });
    expect(result.current.entries).toHaveLength(1);

    act(() => { result.current.clearEntries(); });
    expect(result.current.entries).toHaveLength(0);
  });

  it('no-speech エラーは無視される', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    act(() => { fireError('no-speech'); });

    expect(result.current.error).toBeNull();
    expect(result.current.isRecording).toBe(true);
  });

  it('network エラー時は retryWarning が表示され録音継続', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });

    act(() => {
      fireError('network');
      fireEnd();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.retryWarning).toMatch(/ネットワーク接続を確認/);
    expect(result.current.error).toBeNull();
  });

  it('network エラーが MAX_RETRIES 回続いたら fatal エラーになる', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });

    // タイマーを実行しない = 再起動の onstart が呼ばれず retryCount がリセットされない
    // MAX_RETRIES(5) を超えるには retryCount > 5 = 6 回エラーが必要
    for (let i = 0; i < 6; i++) {
      act(() => {
        fireError('network');
        fireEnd();
      });
    }

    expect(result.current.error).toBe(
      'ネットワークエラーが続いています。インターネット接続を確認して再度お試しください。'
    );
    expect(result.current.isRecording).toBe(false);
  });

  it('network エラー後に正常起動したら retryWarning がクリアされる', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });

    // エラー → タイマー実行前の時点で retryWarning が表示されている
    act(() => {
      fireError('network');
      fireEnd();
    });
    expect(result.current.retryWarning).not.toBeNull();

    // タイマーを実行 → 再起動 → onstart 発火 → retryWarning クリア
    act(() => { vi.runAllTimers(); });
    expect(result.current.retryWarning).toBeNull();
  });

  it('不明なエラーは即座に fatal エラーになる', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startRecording(); });
    act(() => { fireError('not-allowed'); });

    expect(result.current.error).toMatch(/音声認識エラー/);
    expect(result.current.isRecording).toBe(false);
  });
});
