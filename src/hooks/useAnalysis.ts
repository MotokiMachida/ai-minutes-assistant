import { useCallback, useState } from 'react';
import { analyzeTranscript, analyzeAudio as analyzeAudioService, type AnalysisResult } from '../services/gemini';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  audioTranscript: string;
  status: AnalysisStatus;
  errorMessage: string | null;
  analyze: (text: string) => Promise<void>;
  analyzeAudio: (blob: Blob) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyze = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatus('loading');
    setErrorMessage(null);
    try {
      const data = await analyzeTranscript(text);
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  const analyzeAudio = useCallback(async (blob: Blob) => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const data = await analyzeAudioService(blob);
      setAudioTranscript(data.transcript ?? '');
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setAudioTranscript('');
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return { result, audioTranscript, status, errorMessage, analyze, analyzeAudio, reset };
}
