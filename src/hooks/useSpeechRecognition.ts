import { useCallback, useEffect, useRef, useState } from 'react';

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

  const isSupported =
    typeof window !== 'undefined' &&
    (typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined');

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('このブラウザは音声認識に対応していません。Chrome をお使いください。');
      return;
    }
    if (recognitionRef.current) return;

    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();

    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          const text = transcript.trim();
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
          interim = '';
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      setError(`音声認識エラー: ${event.error}`);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    setInterimText('');
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
    entryIdRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isRecording,
    isTranscribing: false,
    isSupported,
    entries,
    interimText,
    error,
    startRecording,
    stopRecording,
    clearEntries,
  };
}
