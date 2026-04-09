import { Mic, MicOff, Radio, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface TranscriptionPanelProps {
  /** Called whenever a final transcript entry is confirmed */
  onTranscriptUpdate?: (fullText: string) => void;
}

export function TranscriptionPanel({ onTranscriptUpdate }: TranscriptionPanelProps) {
  const {
    isRecording,
    isSupported,
    entries,
    interimText,
    error,
    retryWarning,
    startRecording,
    stopRecording,
    clearEntries,
  } = useSpeechRecognition();

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when entries change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, interimText]);

  // Notify parent of full transcript on every new final entry
  useEffect(() => {
    if (entries.length === 0) return;
    const fullText = entries.map((e) => e.text).join('\n');
    onTranscriptUpdate?.(fullText);
  }, [entries, onTranscriptUpdate]);

  const elapsedSeconds = entries.length > 0
    ? Math.round((Date.now() - Date.now()) / 1000) // placeholder — replaced by real timer below
    : 0;
  void elapsedSeconds;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
            リアルタイム文字起こし
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && !isRecording && (
            <button
              onClick={clearEntries}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              クリア
            </button>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                停止
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                録音開始
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs text-red-600 font-medium">録音中 — 日本語で話してください</span>
        </div>
      )}

      {/* Retry warning (transient network issue) */}
      {retryWarning && (
        <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          {retryWarning}
        </div>
      )}

      {/* Fatal error banner */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Unsupported browser warning */}
      {!isSupported && (
        <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          このブラウザはマイク録音に対応していません。Chrome をお使いください。
        </div>
      )}

      {/* Transcript list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {entries.length === 0 && !isRecording && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
            <Mic className="w-8 h-8 opacity-30" />
            <p className="text-sm">録音開始ボタンを押して<br />話し始めてください</p>
          </div>
        )}

        {entries.map((entry, i) => (
          <div key={entry.id} className="flex gap-3 group">
            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 bg-blue-100 text-blue-700">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-400 font-mono">{entry.timestamp}</span>
              <p className="text-sm text-gray-700 leading-relaxed mt-0.5">{entry.text}</p>
            </div>
          </div>
        ))}

        {/* Interim text (in-progress speech) */}
        {interimText && (
          <div className="flex gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 bg-gray-100 text-gray-400">
              …
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 leading-relaxed italic">{interimText}</p>
            </div>
          </div>
        )}

        {/* Listening dots when recording but nothing spoken yet */}
        {isRecording && !interimText && (
          <div className="flex gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 bg-gray-50" />
            <div className="flex items-center gap-1 py-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer stats */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{entries.length} 件の発言</span>
          <span>{entries.length > 0 ? `最終: ${entries[entries.length - 1].timestamp}` : '—'}</span>
        </div>
      </div>
    </div>
  );
}
