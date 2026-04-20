import { useCallback, useState } from 'react';
import {
  analyzeTranscript,
  analyzeAudio as analyzeAudioService,
  analyzeAudioChunked as analyzeAudioChunkedService,
  analyzeAudioLarge as analyzeAudioLargeService,
  type AnalysisResult,
} from '../services/gemini';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ChunkProgress {
  current: number;
  total: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
}

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  audioTranscript: string;
  status: AnalysisStatus;
  errorMessage: string | null;
  chunkProgress: ChunkProgress | null;
  uploadProgress: UploadProgress | null;
  analyze: (text: string, meetingTitle?: string) => Promise<void>;
  analyzeAudio: (blob: Blob, meetingTitle?: string) => Promise<void>;
  analyzeAudioChunked: (blob: Blob, meetingTitle?: string) => Promise<void>;
  analyzeAudioLarge: (blob: Blob, meetingTitle?: string) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const analyze = useCallback(async (text: string, meetingTitle?: string) => {
    if (!text.trim()) return;
    setStatus('loading');
    setErrorMessage(null);
    try {
      const data = await analyzeTranscript(text, meetingTitle);
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  const analyzeAudio = useCallback(async (blob: Blob, meetingTitle?: string) => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const data = await analyzeAudioService(blob, meetingTitle);
      setAudioTranscript(data.transcript ?? '');
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  const analyzeAudioChunked = useCallback(async (blob: Blob, meetingTitle?: string) => {
    setStatus('loading');
    setErrorMessage(null);
    setChunkProgress(null);
    try {
      const data = await analyzeAudioChunkedService(blob, meetingTitle, (current, total) => {
        setChunkProgress({ current, total });
      });
      setAudioTranscript(data.transcript ?? '');
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      setChunkProgress(null);
    }
  }, []);

  const analyzeAudioLarge = useCallback(async (blob: Blob, meetingTitle?: string) => {
    setStatus('loading');
    setErrorMessage(null);
    setUploadProgress(null);
    try {
      const data = await analyzeAudioLargeService(blob, meetingTitle, (loaded, total) => {
        setUploadProgress({ loaded, total });
      });
      setUploadProgress(null);
      setAudioTranscript(data.transcript ?? '');
      setResult(data);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      setUploadProgress(null);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setAudioTranscript('');
    setStatus('idle');
    setErrorMessage(null);
    setChunkProgress(null);
    setUploadProgress(null);
  }, []);

  return { result, audioTranscript, status, errorMessage, chunkProgress, uploadProgress, analyze, analyzeAudio, analyzeAudioChunked, analyzeAudioLarge, reset };
}
