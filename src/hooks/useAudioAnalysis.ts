import { useCallback, useRef, useState } from 'react';

export interface UseAudioAnalysisReturn {
  isRecording: boolean;
  isSupported: boolean;
  audioBlob: Blob | null;
  audioDuration: number; // seconds
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearBlob: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sysStreamRef = useRef<MediaStream | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined';

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      // 1. マイクをキャプチャ
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = micStream;

      // 2. システムオーディオをキャプチャ（拒否された場合はマイクのみで継続）
      let sysStream: MediaStream | null = null;
      try {
        sysStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          // 一部ブラウザでは video なしだと動作しないため最小サイズで指定
          video: { width: 1, height: 1 } as MediaTrackConstraints,
        });
        // ビデオトラックは不要なので即停止
        sysStream.getVideoTracks().forEach((t) => t.stop());
        sysStreamRef.current = sysStream;
      } catch {
        console.warn('[useAudioAnalysis] システムオーディオが取得できませんでした。マイクのみで録音します。');
      }

      // 3. Web Audio API で2ストリームをミキシング
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      if (sysStream && sysStream.getAudioTracks().length > 0) {
        const sysSource = audioContext.createMediaStreamSource(sysStream);
        sysSource.connect(destination);
      }

      // 4. ミキシングしたストリームを録音
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(destination.stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
        setIsRecording(false);
        // リソースを解放
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        sysStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        sysStreamRef.current = null;
        audioContextRef.current?.close();
        audioContextRef.current = null;
      };

      recorder.start(1000); // 1秒ごとにチャンクを収集
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'マイクへのアクセスに失敗しました';
      setError(msg);
      setIsRecording(false);
      // エラー時もリソースをクリーンアップ
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      sysStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      sysStreamRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const clearBlob = useCallback(() => {
    setAudioBlob(null);
    setAudioDuration(0);
  }, []);

  return {
    isRecording,
    isSupported,
    audioBlob,
    audioDuration,
    error,
    startRecording,
    stopRecording,
    clearBlob,
  };
}
