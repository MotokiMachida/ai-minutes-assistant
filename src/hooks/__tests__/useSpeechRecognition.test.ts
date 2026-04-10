import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '../useSpeechRecognition';

// ---------- Mock: transcribeAudio ----------
vi.mock('../../services/gemini', () => ({
  transcribeAudio: vi.fn(),
}));
import { transcribeAudio } from '../../services/gemini';
const mockTranscribeAudio = vi.mocked(transcribeAudio);

// ---------- Mock: MediaRecorder ----------
// Produces a blob > 500 bytes so it passes the size filter
const LARGE_AUDIO = new Uint8Array(600).fill(1);

class MockMediaRecorder {
  static isTypeSupported = () => true;
  mimeType = 'audio/webm';
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([LARGE_AUDIO], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

// ---------- Mock: MediaStream ----------
class MockMediaStream {
  getTracks() { return [{ stop: vi.fn() }]; }
}

// ---------- Mock: FileReader ----------
// Resolves synchronously (no timeout) to avoid fake-timer complexity
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_blob: Blob) {
    this.result = 'data:audio/webm;base64,dGVzdA==';
    this.onload?.();
  }
}

beforeEach(() => {
  vi.useFakeTimers();

  Object.defineProperty(window, 'MediaRecorder', {
    value: MockMediaRecorder,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'FileReader', {
    value: MockFileReader,
    writable: true,
    configurable: true,
  });

  mockTranscribeAudio.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------- helpers ----------

/** startRecording + wait one full SEGMENT_MS so at least one blob is buffered */
async function startAndBuffer(result: ReturnType<typeof useSpeechRecognition>) {
  await act(async () => { result.startRecording(); });
  // Advance past SEGMENT_MS so recordSegment's timeout fires and blob is buffered
  await act(async () => { await vi.advanceTimersByTimeAsync(5001); });
}

// ---------- tests ----------
describe('useSpeechRecognition', () => {
  it('初期状態の確認', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.isSupported).toBe(true);
    expect(result.current.entries).toHaveLength(0);
    expect(result.current.interimText).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('startRecording で isRecording が true になる', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(async () => { result.current.startRecording(); });
    expect(result.current.isRecording).toBe(true);
  });

  it('startRecording は重複して呼んでも getUserMedia は1回だけ', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(async () => {
      result.current.startRecording();
      result.current.startRecording();
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('stopRecording で isRecording が false になる', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(async () => { result.current.startRecording(); });
    act(() => { result.current.stopRecording(); });
    expect(result.current.isRecording).toBe(false);
  });

  it('stopRecording 後に isTranscribing が true になり完了後 false になる', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await startAndBuffer(result.current);

    let resolveTranscribe!: (v: string) => void;
    mockTranscribeAudio.mockReturnValue(
      new Promise<string>((res) => { resolveTranscribe = res; })
    );

    act(() => { result.current.stopRecording(); });
    expect(result.current.isTranscribing).toBe(true);

    await act(async () => { resolveTranscribe('テスト'); });
    expect(result.current.isTranscribing).toBe(false);
  });

  it('文字起こし結果が entries に追加される', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await startAndBuffer(result.current);

    mockTranscribeAudio.mockResolvedValue('こんにちは、テストです。');
    await act(async () => { result.current.stopRecording(); });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].text).toBe('こんにちは、テストです。');
    expect(result.current.entries[0].isFinal).toBe(true);
  });

  it('文字起こし結果が空文字の場合は entries に追加されない', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await startAndBuffer(result.current);

    mockTranscribeAudio.mockResolvedValue('');
    await act(async () => { result.current.stopRecording(); });

    expect(result.current.entries).toHaveLength(0);
  });

  it('バッファが空のまま停止した場合は transcribeAudio を呼ばない', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(async () => { result.current.startRecording(); });
    // 停止 — まだ5秒経っていないのでバッファ空
    act(() => { result.current.stopRecording(); });

    expect(mockTranscribeAudio).not.toHaveBeenCalled();
    expect(result.current.isTranscribing).toBe(false);
  });

  it('clearEntries で entries がリセットされる', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await startAndBuffer(result.current);

    mockTranscribeAudio.mockResolvedValue('テスト発言');
    await act(async () => { result.current.stopRecording(); });
    expect(result.current.entries).toHaveLength(1);

    act(() => { result.current.clearEntries(); });
    expect(result.current.entries).toHaveLength(0);
  });

  it('マイクアクセス拒否時に error がセットされる', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useSpeechRecognition());
    await act(async () => { result.current.startRecording(); });

    expect(result.current.error).toMatch(/マイクへのアクセスが拒否/);
    expect(result.current.isRecording).toBe(false);
  });

  it('文字起こし失敗時に error がセットされ isTranscribing が false になる', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await startAndBuffer(result.current);

    mockTranscribeAudio.mockRejectedValue(new Error('API error'));
    await act(async () => { result.current.stopRecording(); });

    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.error).toMatch(/文字起こしに失敗/);
  });
});
