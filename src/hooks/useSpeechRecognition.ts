import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '../services/gemini';

export interface TranscriptEntry {
  id: number;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  entries: TranscriptEntry[];
  interimText: string;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  clearEntries: () => void;
}

/** Duration of each audio segment buffered during recording (ms) */
const SEGMENT_MS = 5000;

function getTimestamp(): string {
  return new Date().toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip "data:...;base64,"
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Record exactly `durationMs` of audio, then resolve with the Blob.
 *  Resolves with null if the signal is aborted before recording ends. */
function recordSegment(
  stream: MediaStream,
  durationMs: number,
  signal: AbortSignal,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      resolve(signal.aborted ? null : new Blob(chunks, { type: recorder.mimeType }));
    };

    recorder.start();

    const timer = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, durationMs);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      if (recorder.state === 'recording') recorder.stop();
    });
  });
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const entryIdRef = useRef(0);
  const isRecordingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Blob[]>([]);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('このブラウザはマイク録音に対応していません。Chrome をお使いください。');
      return;
    }
    if (isRecordingRef.current) return;
    isRecordingRef.current = true; // guard before await to prevent duplicate calls

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      isRecordingRef.current = false;
      setError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
      return;
    }

    streamRef.current = stream;
    audioBufferRef.current = [];
    setError(null);
    setIsRecording(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Recording loop: accumulate audio blobs — no API calls until stop
    (async () => {
      while (isRecordingRef.current) {
        const blob = await recordSegment(stream, SEGMENT_MS, abortController.signal);
        if (blob && blob.size >= 500) {
          audioBufferRef.current.push(blob);
        }
      }
    })();
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);

    // Drain buffer and send ONE request to Gemini
    const blobsToSend = audioBufferRef.current.splice(0);
    if (blobsToSend.length === 0) return;

    const merged = new Blob(blobsToSend, { type: blobsToSend[0].type });
    setIsTranscribing(true);

    (async () => {
      try {
        const base64 = await blobToBase64(merged);
        const text = await transcribeAudio(base64, merged.type);
        if (text) {
          setEntries((prev) => [
            ...prev,
            {
              id: ++entryIdRef.current,
              text,
              timestamp: getTimestamp(),
              isFinal: true,
            },
          ]);
        }
      } catch (err) {
        console.warn('Gemini transcription error:', err);
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
          setError('APIの利用上限に達しています。しばらく待ってから再度お試しください。');
        } else {
          setError('文字起こしに失敗しました。もう一度お試しください。');
        }
      } finally {
        setIsTranscribing(false);
      }
    })();
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
    entryIdRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      abortControllerRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    isSupported,
    entries,
    interimText: '',
    error,
    startRecording,
    stopRecording,
    clearEntries,
  };
}
