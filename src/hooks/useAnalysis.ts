import { useCallback, useState } from 'react';
import { analyzeTranscript, type AnalysisResult } from '../services/gemini';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  status: AnalysisStatus;
  errorMessage: string | null;
  analyze: (text: string) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
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

  const reset = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return { result, status, errorMessage, analyze, reset };
}
