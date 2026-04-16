import {
  Sparkles,
  ClipboardList,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
  Download,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useAnalysis } from '../hooks/useAnalysis';
import type { MeetingInfo } from '../App';
import type { RecordingMode } from './TranscriptionPanel';

type SectionKey = 'summary' | 'todos' | 'decisions';

interface CheckedTodos {
  [id: number]: boolean;
}

interface AnalysisPanelProps {
  transcriptText?: string;
  audioBlob?: Blob | null;
  mode?: RecordingMode;
  meetingInfo?: MeetingInfo;
  /** 音声分析で得られたトランスクリプトを親へ通知 */
  onAudioTranscriptReady?: (transcript: string) => void;
}

export function AnalysisPanel({ transcriptText, audioBlob, mode = 'text', meetingInfo, onAudioTranscriptReady }: AnalysisPanelProps) {
  const { result, audioTranscript, status, errorMessage, analyze, analyzeAudio, reset } = useAnalysis();

  // 音声モードの分析が完了したらトランスクリプト（空文字含む）を親へ通知
  useEffect(() => {
    if (status === 'success' && mode === 'audio') {
      onAudioTranscriptReady?.(audioTranscript);
    }
  }, [status, mode, audioTranscript, onAudioTranscriptReady]);

  const handleExport = useCallback(() => {
    if (!result) return;

    const title = meetingInfo?.title || '議事録';
    const date = meetingInfo?.date || '';
    const time = meetingInfo?.time || '';
    const participants = meetingInfo?.participants || '';

    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push('');
    if (date || time) lines.push(`**日時:** ${date}${time ? ' ' + time : ''}`);
    if (participants) lines.push(`**参加者:** ${participants}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 要約');
    lines.push('');
    lines.push(result.summary);
    lines.push('');
    lines.push('## ToDo');
    lines.push('');
    if (result.todos.length === 0) {
      lines.push('なし');
    } else {
      for (const todo of result.todos) {
        lines.push(`- [ ] ${todo.text}（担当: ${todo.assignee}、期限: ${todo.deadline}）`);
      }
    }
    lines.push('');
    lines.push('## 決定事項');
    lines.push('');
    if (result.decisions.length === 0) {
      lines.push('なし');
    } else {
      for (const d of result.decisions) {
        lines.push(`- ${d.text}（決定者: ${d.decidedBy}）`);
      }
    }
    if (transcriptText) {
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('## 文字起こし');
      lines.push('');
      lines.push(transcriptText);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${title}_${date || 'minutes'}.md`.replace(/\s+/g, '_');
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, meetingInfo, transcriptText]);

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    summary: true,
    todos: true,
    decisions: true,
  });
  const [checked, setChecked] = useState<CheckedTodos>({});

  const toggleSection = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTodo = (index: number) =>
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));

  const handleAnalyze = useCallback(() => {
    setChecked({});
    const title = meetingInfo?.title?.trim() || undefined;
    if (transcriptText?.trim()) {
      // テキストモード、または音声モードで編集済み／取得済みトランスクリプトがある場合
      // → 手動編集を優先してテキストで分析
      analyze(transcriptText, title);
    } else if (mode === 'audio' && audioBlob) {
      // 音声モードの初回分析（トランスクリプト未取得）→ 音声Blobを直接送信
      analyzeAudio(audioBlob, title);
    }
  }, [mode, audioBlob, transcriptText, meetingInfo, analyze, analyzeAudio]);

  const handleReset = useCallback(() => {
    reset();
    setChecked({});
  }, [reset]);

  const isLoading = status === 'loading';
  const hasResult = status === 'success' && result !== null;
  const canAnalyze = (!!transcriptText?.trim() || (mode === 'audio' && !!audioBlob)) && !isLoading;
  const pendingCount = result ? result.todos.filter((_, i) => !checked[i]).length : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">
            AI 分析結果
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {hasResult && (
            <>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                MD
              </button>
              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                クリア
              </button>
            </>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {hasResult ? '再分析' : '分析開始'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Idle / no input state */}
        {status === 'idle' && !canAnalyze && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
            <MessageSquareText className="w-8 h-8 opacity-30" />
            <p className="text-sm">
              {mode === 'audio'
                ? <>左パネルで録音を完了すると<br />「分析開始」ボタンが有効になります</>
                : <>左パネルで録音を開始すると<br />「分析開始」ボタンが有効になります</>}
            </p>
          </div>
        )}

        {/* Input ready but not yet analyzed */}
        {status === 'idle' && canAnalyze && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <Sparkles className={`w-8 h-8 ${mode === 'audio' ? 'text-purple-300' : 'text-blue-300'}`} />
            <p className="text-sm text-gray-500">
              {mode === 'audio' ? '録音が完了しました' : '文字起こしが準備できました'}
            </p>
            <button
              onClick={handleAnalyze}
              className={`mt-1 flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-full transition-colors shadow-sm ${
                mode === 'audio'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Gemini で分析する
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-white flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="w-16 h-4 bg-gray-200 rounded" />
                </div>
                <div className="px-4 py-3 bg-gray-50 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {status === 'error' && errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">分析に失敗しました</p>
              <p className="text-xs text-red-500 mt-1 break-all">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {hasResult && result && (
          <>
            {/* Summary */}
            <section className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('summary')}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">要約</span>
                </div>
                {open.summary ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {open.summary && (
                <div className="px-4 pb-4 pt-2 bg-blue-50 border-t border-blue-100">
                  <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                </div>
              )}
            </section>

            {/* ToDo */}
            <section className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('todos')}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-700">ToDo</span>
                  {result.todos.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {pendingCount}
                    </span>
                  )}
                </div>
                {open.todos ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {open.todos && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {result.todos.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 text-center">
                      検出されたタスクはありません
                    </p>
                  ) : (
                    result.todos.map((todo, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <button
                          onClick={() => toggleTodo(i)}
                          className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            checked[i]
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {checked[i] && (
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${checked[i] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {todo.text}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-gray-400">
                              担当: <span className="font-medium text-gray-500">{todo.assignee}</span>
                            </span>
                            <span className="text-xs text-gray-400">
                              期限: <span className="font-medium text-orange-500">{todo.deadline}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Decisions */}
            <section className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('decisions')}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">決定事項</span>
                  {result.decisions.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {result.decisions.length}
                    </span>
                  )}
                </div>
                {open.decisions ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {open.decisions && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {result.decisions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 text-center">
                      検出された決定事項はありません
                    </p>
                  ) : (
                    result.decisions.map((decision, i) => (
                      <div key={i} className="px-4 py-3 bg-white">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
                          <div>
                            <p className="text-sm text-gray-700 leading-snug">{decision.text}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              決定者: <span className="font-medium text-gray-500">{decision.decidedBy}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400 text-center">
          Gemini による自動分析 — 内容を必ず確認してください
        </p>
      </div>
    </div>
  );
}
