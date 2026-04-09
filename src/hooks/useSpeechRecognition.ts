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
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  clearEntries: () => void;
}

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

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const entryIdRef = useRef(0);
  // Keep a ref to avoid stale closure in onresult
  const isRecordingRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const buildRecognition = useCallback((): SpeechRecognition => {
    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();

    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          if (transcript.length === 0) continue;
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
      if (event.error === 'no-speech') return; // suppress noise
      if (event.error === 'aborted') return;    // intentional stop
      setError(`音声認識エラー: ${event.error}`);
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognition.onend = () => {
      // Auto-restart if user hasn't stopped manually
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started — ignore
        }
      } else {
        setIsRecording(false);
        setInterimText('');
      }
    };

    return recognition;
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('このブラウザは Web Speech API に対応していません。Chrome をお使いください。');
      return;
    }
    if (isRecordingRef.current) return;

    const recognition = buildRecognition();
    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, buildRecognition]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText('');
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
    entryIdRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isRecording,
    isSupported,
    entries,
    interimText,
    error,
    startRecording,
    stopRecording,
    clearEntries,
  };
}
