import {
  Sparkles,
  ClipboardList,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

interface TodoItem {
  id: number;
  text: string;
  assignee: string;
  deadline: string;
  done: boolean;
}

interface DecisionItem {
  id: number;
  text: string;
  decided_by: string;
}

const SUMMARY =
  'APIの実装が完了しマージ済み。フロントエンドUIは来週水曜日までに完成予定で、木曜日にデザインレビューを実施。テスト環境構築はインフラチームへの依頼が必要。';

const TODOS: TodoItem[] = [
  {
    id: 1,
    text: 'フロントエンドの基本UIを実装する',
    assignee: '佐藤',
    deadline: '来週水曜日',
    done: false,
  },
  {
    id: 2,
    text: 'デザインレビューのスケジュールを確定する',
    assignee: '田中',
    deadline: '今週中',
    done: false,
  },
  {
    id: 3,
    text: 'テスト環境構築をインフラチームに依頼する',
    assignee: '鈴木',
    deadline: '本日中',
    done: true,
  },
];

const DECISIONS: DecisionItem[] = [
  {
    id: 1,
    text: 'フロントエンド実装のデッドラインを来週水曜日とする',
    decided_by: '田中、佐藤',
  },
  {
    id: 2,
    text: 'デザインレビューは木曜日に実施する',
    decided_by: '田中',
  },
];

type SectionKey = 'summary' | 'todos' | 'decisions';

interface AnalysisPanelProps {
  /** Full transcript text passed from TranscriptionPanel (used in AI analysis branch) */
  transcriptText?: string;
}

export function AnalysisPanel({ transcriptText: _transcriptText }: AnalysisPanelProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    summary: true,
    todos: true,
    decisions: true,
  });
  const [todos, setTodos] = useState<TodoItem[]>(TODOS);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleSection = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTodo = (id: number) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1500);
  };

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
        <button
          onClick={handleRegenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`}
          />
          {isGenerating ? '生成中...' : '再生成'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Summary Section */}
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
            <div className="px-4 pb-4 pt-1 bg-blue-50 border-t border-blue-100">
              <p className="text-sm text-gray-700 leading-relaxed">{SUMMARY}</p>
            </div>
          )}
        </section>

        {/* ToDo Section */}
        <section className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('todos')}
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">ToDo</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                {todos.filter((t) => !t.done).length}
              </span>
            </div>
            {open.todos ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {open.todos && (
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      todo.done
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {todo.done && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        todo.done ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {todo.text}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">
                        担当:{' '}
                        <span className="font-medium text-gray-500">
                          {todo.assignee}
                        </span>
                      </span>
                      <span className="text-xs text-gray-400">
                        期限:{' '}
                        <span className="font-medium text-orange-500">
                          {todo.deadline}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Decisions Section */}
        <section className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('decisions')}
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">決定事項</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {DECISIONS.length}
              </span>
            </div>
            {open.decisions ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {open.decisions && (
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {DECISIONS.map((decision) => (
                <div key={decision.id} className="px-4 py-3 bg-white">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
                    <div>
                      <p className="text-sm text-gray-700 leading-snug">
                        {decision.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        決定者:{' '}
                        <span className="font-medium text-gray-500">
                          {decision.decided_by}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400 text-center">
          AI による自動分析 — 内容を必ず確認してください
        </p>
      </div>
    </div>
  );
}
