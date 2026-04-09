import { useCallback, useEffect, useRef, useState } from 'react';

export interface TranscriptEntry {
  id: number;
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isSupported: boolean;
  entries: TranscriptEntry[];
  interimText: string;
  /** Non-null when a fatal (non-retryable) error occurred */
  error: string | null;
  /** Non-null while a transient error is being retried */
  retryWarning: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  clearEntries: () => void;
}

/** Errors that are transient — safe to retry automatically */
const RETRYABLE_ERRORS = new Set(['network', 'service-not-allowed']);
/** Errors we silently ignore */
const SILENT_ERRORS = new Set(['no-speech', 'aborted']);
/** Give up after this many consecutive retryable errors */
const MAX_RETRIES = 5;

function getTimestamp(): string {
  return new Date().toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryWarning, setRetryWarning] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const entryIdRef = useRef(0);
  const isRecordingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startInstance = useCallback(() => {
    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();

    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      // Clear retry warning once we successfully start
      setRetryWarning(null);
      retryCountRef.current = 0;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          if (!transcript) continue;
          setEntries((prev) => [
            ...prev,
            {
              id: ++entryIdRef.current,
              text: transcript,
              timestamp: getTimestamp(),
              isFinal: true,
            },
          ]);
          setInterimText('');
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (SILENT_ERRORS.has(event.error)) return;

      if (RETRYABLE_ERRORS.has(event.error)) {
        // Keep isRecordingRef true so onend will attempt restart
        retryCountRef.current += 1;
        if (retryCountRef.current <= MAX_RETRIES) {
          setRetryWarning(
            `ネットワーク接続を確認しています... (${retryCountRef.current}/${MAX_RETRIES})`
          );
        } else {
          // Give up
          isRecordingRef.current = false;
          setError(
            'ネットワークエラーが続いています。インターネット接続を確認して再度お試しください。'
          );
          setRetryWarning(null);
          setIsRecording(false);
        }
        return;
      }

      // Fatal, non-retryable error
      isRecordingRef.current = false;
      setError(`音声認識エラー: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (!isRecordingRef.current) {
        setIsRecording(false);
        setInterimText('');
        return;
      }

      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
      const delay = Math.min(500 * 2 ** (retryCountRef.current - 1), 8000);
      const actualDelay = retryCountRef.current > 0 ? delay : 0;

      retryTimerRef.current = setTimeout(() => {
        if (!isRecordingRef.current) return;
        try {
          const next = startInstance();
          recognitionRef.current = next;
          next.start();
        } catch {
          // recognition already starting — ignore
        }
      }, actualDelay);
    };

    return recognition;
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('このブラウザは Web Speech API に対応していません。Chrome をお使いください。');
      return;
    }
    if (isRecordingRef.current) return;

    setError(null);
    setRetryWarning(null);
    retryCountRef.current = 0;
    isRecordingRef.current = true;

    const recognition = startInstance();
    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, startInstance]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText('');
    setRetryWarning(null);
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
    entryIdRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isRecording,
    isSupported,
    entries,
    interimText,
    error,
    retryWarning,
    startRecording,
    stopRecording,
    clearEntries,
  };
}
