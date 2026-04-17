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
  Pencil,
  Eye,
  Download,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  /** 音声分析後のトランスクリプト（null=未分析、string=分析済み） */
  audioTranscript?: string | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** "話者A: テキスト" の形式を解析して話者ラベルと発言を分離 */
function parseSpeakerLine(line: string): { speaker: string; text: string } | null {
  const match = line.match(/^(.+?):\s*(.+)$/);
  if (!match) return null;
  return { speaker: match[1].trim(), text: match[2].trim() };
}

/** 話者ラベルに一貫した色を割り当てる */
const SPEAKER_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function getSpeakerColor(speaker: string, colorMap: Map<string, string>): string {
  if (!colorMap.has(speaker)) {
    const idx = colorMap.size % SPEAKER_COLORS.length;
    colorMap.set(speaker, SPEAKER_COLORS[idx]);
  }
  return colorMap.get(speaker)!;
}

export function TranscriptionPanel({
  mode,
  onModeChange,
  onTranscriptUpdate,
  onAudioReady,
  audioTranscript,
}: TranscriptionPanelProps) {
  // テキストモード用
  const speech = useSpeechRecognition();

  // 高精度音声モード用
  const audio = useAudioAnalysis();

  const bottomRef = useRef<HTMLDivElement>(null);

  // 音声モードのトランスクリプト編集状態
  const [editableTranscript, setEditableTranscript] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  // 話者→色のマッピング（レンダリングごとに安定させるため useRef）
  const colorMapRef = useRef(new Map<string, string>());

  // audioTranscript prop が更新されたら（Gemini から返った）ローカル状態を初期化
  // null = 未分析なのでスキップ、string（空文字含む）= 分析済みとして扱う
  useEffect(() => {
    if (audioTranscript === null || audioTranscript === undefined) return;
    colorMapRef.current = new Map();
    setEditableTranscript(audioTranscript);
    // transcript が空のときは編集モードを自動で開く
    setIsEditMode(!audioTranscript);
    if (audioTranscript) onTranscriptUpdate?.(audioTranscript);
  }, [audioTranscript, onTranscriptUpdate]);

  // モード切り替え時に進行中の録音を停止（リソースリーク防止）
  useEffect(() => {
    return () => {
      audio.stopRecording();
      speech.stopRecording();
    };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleTranscriptEdit = (text: string) => {
    setEditableTranscript(text);
    onTranscriptUpdate?.(text);
  };

  const handleClearAudio = () => {
    audio.clearBlob();
    setEditableTranscript('');
    setIsEditMode(false);
    onTranscriptUpdate?.('');
  };

  const handleDownload = (blob: Blob, index: number) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${index}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 録音中は全件、停止後は最新以外を「過去の録音」として表示
  const pastRecordings = audio.isRecording
    ? audio.recordings
    : audio.recordings.slice(0, -1);

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
                <><MicOff className="w-4 h-4" />録音停止</>
              ) : (
                <><Mic className="w-4 h-4" />録音開始</>
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
                <><CircleStop className="w-4 h-4" />録音停止</>
              ) : (
                <><AudioLines className="w-4 h-4" />録音開始</>
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
          mode === 'audio' ? 'bg-purple-50 border-purple-100' : 'bg-red-50 border-red-100'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              mode === 'audio' ? 'bg-purple-400' : 'bg-red-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              mode === 'audio' ? 'bg-purple-500' : 'bg-red-500'
            }`} />
          </span>
          <span className={`text-xs font-medium ${mode === 'audio' ? 'text-purple-600' : 'text-red-600'}`}>
            {mode === 'audio'
              ? '録音中 — マイク＋システムオーディオをミキシングしています'
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
              <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 bg-gray-100 text-gray-400">…</span>
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

      {/* ---- 高精度音声モード ---- */}
      {mode === 'audio' && (
        <>
          {/* 過去の録音リスト（録音中 or 2回目以降） */}
          {pastRecordings.length > 0 && (
            <div className="border-b border-gray-100 divide-y divide-gray-100">
              {pastRecordings.map((rec, i) => (
                <div key={rec.id} className="flex items-center justify-between px-4 py-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      録音 {i + 1} — {formatDuration(rec.duration)} ／ {(rec.blob.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownload(rec.blob, i + 1)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    DL
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 録音前 / 録音中 */}
          {(!audio.audioBlob || audio.isRecording) && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 text-center gap-4">
              {!audio.isRecording ? (
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
              ) : (
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
            </div>
          )}

          {/* 録音完了 + トランスクリプト表示（最新録音・停止後のみ） */}
          {audio.audioBlob && !audio.isRecording && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 録音完了バー */}
              <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-700 font-medium">
                    {audio.recordings.length > 1 ? `録音 ${audio.recordings.length} — ` : '録音完了 — '}
                    {formatDuration(audio.audioDuration)} ／ {(audio.audioBlob.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDownload(audio.audioBlob!, audio.recordings.length)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    DL
                  </button>
                  {editableTranscript && (
                    <button
                      onClick={() => setIsEditMode((v) => !v)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors ${
                        isEditMode
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {isEditMode ? <><Eye className="w-3 h-3" />表示</>: <><Pencil className="w-3 h-3" />編集</>}
                    </button>
                  )}
                  <button
                    onClick={handleClearAudio}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    クリア
                  </button>
                </div>
              </div>

              {/* トランスクリプトエリア（分析済みなら空でも表示） */}
              {audioTranscript !== null && audioTranscript !== undefined ? (
                <div className="flex-1 overflow-y-auto">
                  {isEditMode ? (
                    /* 編集モード: textarea */
                    <div className="h-full flex flex-col p-4 gap-2">
                      <p className="text-xs text-purple-600 font-medium">
                        内容を修正してください。再分析時は編集済みテキストが優先されます。
                      </p>
                      <textarea
                        value={editableTranscript}
                        onChange={(e) => handleTranscriptEdit(e.target.value)}
                        placeholder="Gemini からトランスクリプトが返されませんでした。ここに手動で内容を入力すると再分析できます。"
                        className="flex-1 text-sm text-gray-700 leading-relaxed border border-purple-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 font-mono"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    /* 表示モード: 話者ラベル付きビュー */
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-gray-400">
                        Gemini による話者識別トランスクリプト —
                        <button onClick={() => setIsEditMode(true)} className="ml-1 text-purple-500 hover:underline">
                          編集する
                        </button>
                      </p>
                      {editableTranscript.split('\n').map((line, i) => {
                        const parsed = parseSpeakerLine(line);
                        if (!parsed) {
                          return line.trim() ? (
                            <p key={i} className="text-sm text-gray-600 leading-relaxed pl-2">{line}</p>
                          ) : null;
                        }
                        const colorClass = getSpeakerColor(parsed.speaker, colorMapRef.current);
                        return (
                          <div key={i} className="flex gap-2 items-start">
                            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                              {parsed.speaker}
                            </span>
                            <p className="flex-1 text-sm text-gray-700 leading-relaxed pt-0.5">{parsed.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* 分析前（blob はあるがトランスクリプト未取得） */
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
                  <Loader2 className="w-6 h-6 text-purple-300 animate-spin" />
                  <p className="text-sm text-gray-500">
                    右パネルの「分析開始」で Gemini に送信すると<br />
                    話者識別トランスクリプトがここに表示されます
                  </p>
                </div>
              )}
            </div>
          )}
        </>
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
              <span>{audio.audioBlob ? (editableTranscript ? '編集可能' : '分析待ち') : audio.isRecording ? '録音中...' : '待機中'}</span>
              <span>{audio.audioDuration > 0 ? `録音時間: ${formatDuration(audio.audioDuration)}` : '—'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
