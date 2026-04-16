import {
  Mic,
  MicOff,
  Radio,
  Trash2,
  AlertCircle,
  Loader2,
  AudioLines,
  CircleStop,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';

export type RecordingMode = 'text' | 'audio';

interface TranscriptionPanelProps {
  mode: RecordingMode;
  onModeChange: (mode: RecordingMode) => void;
  /** テキストモード: 最終確定済みテキスト全文を通知 */
  onTranscriptUpdate?: (fullText: string) => void;
  /** 高精度音声モード: 録音停止後に Blob を通知 */
  onAudioReady?: (blob: Blob) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function TranscriptionPanel({
  mode,
  onModeChange,
  onTranscriptUpdate,
  onAudioReady,
}: TranscriptionPanelProps) {
  // テキストモード用
  const speech = useSpeechRecognition();

  // 高精度音声モード用
  const audio = useAudioAnalysis();

  const bottomRef = useRef<HTMLDivElement>(null);

  // テキストモード: エントリが増えるたびに親へ通知
  useEffect(() => {
    if (mode !== 'text' || speech.entries.length === 0) return;
    const fullText = speech.entries.map((e) => e.text).join('\n');
    onTranscriptUpdate?.(fullText);
  }, [mode, speech.entries, onTranscriptUpdate]);

  // テキストモード: 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [speech.entries, speech.interimText]);

  // 高精度音声モード: 録音完了時に Blob を親へ通知
  useEffect(() => {
    if (mode !== 'audio' || !audio.audioBlob) return;
    onAudioReady?.(audio.audioBlob);
  }, [mode, audio.audioBlob, onAudioReady]);

  const isBusy = mode === 'text'
    ? (speech.isRecording || speech.isTranscribing)
    : audio.isRecording;

  const currentError = mode === 'text' ? speech.error : audio.error;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
            音声文字起こし
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* クリアボタン (テキストモードのみ) */}
          {mode === 'text' && speech.entries.length > 0 && !isBusy && (
            <button
              onClick={speech.clearEntries}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              クリア
            </button>
          )}

          {/* 録音ボタン */}
          {mode === 'text' ? (
            <button
              onClick={speech.isRecording ? speech.stopRecording : speech.startRecording}
              disabled={!speech.isSupported || speech.isTranscribing}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                speech.isRecording
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {speech.isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  録音停止
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  録音開始
                </>
              )}
            </button>
          ) : (
            <button
              onClick={audio.isRecording ? audio.stopRecording : audio.startRecording}
              disabled={!audio.isSupported}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                audio.isRecording
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
              }`}
            >
              {audio.isRecording ? (
                <>
                  <CircleStop className="w-4 h-4" />
                  録音停止
                </>
              ) : (
                <>
                  <AudioLines className="w-4 h-4" />
                  録音開始
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* モード切り替えタブ */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => onModeChange('text')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'text'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            テキストモード
          </span>
        </button>
        <button
          onClick={() => onModeChange('audio')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            mode === 'audio'
              ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <AudioLines className="w-3.5 h-3.5" />
            高精度音声モード
          </span>
        </button>
      </div>

      {/* 録音中インジケーター */}
      {isBusy && (
        <div className={`flex items-center gap-2 px-6 py-2 border-b ${
          mode === 'audio'
            ? 'bg-purple-50 border-purple-100'
            : 'bg-red-50 border-red-100'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              mode === 'audio' ? 'bg-purple-400' : 'bg-red-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              mode === 'audio' ? 'bg-purple-500' : 'bg-red-500'
            }`} />
          </span>
          <span className={`text-xs font-medium ${
            mode === 'audio' ? 'text-purple-600' : 'text-red-600'
          }`}>
            {mode === 'audio'
              ? `録音中 — マイク＋システムオーディオをミキシングしています`
              : '録音中 — リアルタイムで文字起こしされています'}
          </span>
        </div>
      )}

      {/* Gemini 文字起こし中 (テキストモード) */}
      {mode === 'text' && speech.isTranscribing && (
        <div className="flex items-center gap-2 px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          Gemini が文字起こし中です。しばらくお待ちください…
        </div>
      )}

      {/* エラーバナー */}
      {currentError && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {currentError}
        </div>
      )}

      {/* ブラウザ未対応 (テキストモード) */}
      {mode === 'text' && !speech.isSupported && (
        <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          このブラウザはマイク録音に対応していません。Chrome をお使いください。
        </div>
      )}

      {/* ---- テキストモード: 文字起こしリスト ---- */}
      {mode === 'text' && (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {speech.entries.length === 0 && !isBusy && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
              <Mic className="w-8 h-8 opacity-30" />
              <p className="text-sm">
                録音開始ボタンを押して話し始めてください<br />
                <span className="text-xs">話しながらリアルタイムでテキスト化されます</span>
              </p>
            </div>
          )}

          {speech.entries.map((entry, i) => (
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

          {speech.interimText && (
            <div className="flex gap-3">
              <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 bg-gray-100 text-gray-400">
                …
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400 leading-relaxed italic">{speech.interimText}</p>
              </div>
            </div>
          )}

          {speech.isRecording && (
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
      )}

      {/* ---- 高精度音声モード: 録音状態UI ---- */}
      {mode === 'audio' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 text-center gap-4">
          {!audio.isRecording && !audio.audioBlob && (
            <>
              <AudioLines className="w-10 h-10 text-purple-200" />
              <div className="space-y-1">
                <p className="text-sm text-gray-600 font-medium">高精度音声モード</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  マイクとシステムオーディオを同時に録音し<br />
                  音声ファイルを直接 Gemini に送信します<br />
                  <span className="text-purple-400">話者識別による高精度な分析が可能です</span>
                </p>
              </div>
              {!audio.isSupported && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  このブラウザは MediaRecorder に対応していません。Chrome をお使いください。
                </p>
              )}
            </>
          )}

          {audio.isRecording && (
            <>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                  <AudioLines className="w-8 h-8 text-purple-500" />
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-700 font-medium">録音中</p>
                <p className="text-xs text-gray-400">録音を停止すると自動的に分析の準備が整います</p>
              </div>
            </>
          )}

          {!audio.isRecording && audio.audioBlob && (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <div className="space-y-1">
                <p className="text-sm text-gray-700 font-medium">録音完了</p>
                <p className="text-xs text-gray-500">
                  録音時間: {formatDuration(audio.audioDuration)} ／
                  ファイルサイズ: {(audio.audioBlob.size / 1024).toFixed(0)} KB
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  右パネルの「分析開始」ボタンで Gemini に送信できます
                </p>
              </div>
              <button
                onClick={audio.clearBlob}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                録音をクリア
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          {mode === 'text' ? (
            <>
              <span>{speech.entries.length} 件の文字起こし</span>
              <span>{speech.entries.length > 0 ? `最終: ${speech.entries[speech.entries.length - 1].timestamp}` : '—'}</span>
            </>
          ) : (
            <>
              <span>{audio.audioBlob ? '録音完了' : audio.isRecording ? '録音中...' : '待機中'}</span>
              <span>{audio.isRecording ? `経過: ${formatDuration(Math.round((Date.now() - Date.now()) / 1000))}` : audio.audioDuration > 0 ? `録音時間: ${formatDuration(audio.audioDuration)}` : '—'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
