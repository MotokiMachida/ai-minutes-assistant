import { Mic, MicOff, Radio } from 'lucide-react';
import { useState } from 'react';

interface TranscriptEntry {
  id: number;
  speaker: string;
  text: string;
  timestamp: string;
}

const SAMPLE_TRANSCRIPT: TranscriptEntry[] = [
  {
    id: 1,
    speaker: '田中',
    text: '今日のミーティングを始めます。まず先週の進捗について確認したいと思います。',
    timestamp: '10:00:12',
  },
  {
    id: 2,
    speaker: '鈴木',
    text: '先週はAPIの実装が完了しました。レビューも通過して、main ブランチにマージ済みです。',
    timestamp: '10:00:45',
  },
  {
    id: 3,
    speaker: '田中',
    text: 'ありがとうございます。次のタスクはフロントエンドの実装ですね。スケジュールはいかがですか？',
    timestamp: '10:01:10',
  },
  {
    id: 4,
    speaker: '佐藤',
    text: '来週水曜日までに基本的なUIを完成させる予定です。デザインレビューは木曜日を想定しています。',
    timestamp: '10:01:38',
  },
  {
    id: 5,
    speaker: '鈴木',
    text: 'テスト環境の構築も並行して進める必要があります。インフラチームに依頼を出しましょうか？',
    timestamp: '10:02:05',
  },
];

const SPEAKER_COLORS: Record<string, string> = {
  田中: 'bg-blue-100 text-blue-700',
  鈴木: 'bg-emerald-100 text-emerald-700',
  佐藤: 'bg-violet-100 text-violet-700',
};

export function TranscriptionPanel() {
  const [isRecording, setIsRecording] = useState(false);

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
        <button
          onClick={() => setIsRecording((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
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

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs text-red-600 font-medium">録音中...</span>
        </div>
      )}

      {/* Transcript list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {SAMPLE_TRANSCRIPT.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <span
              className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 ${
                SPEAKER_COLORS[entry.speaker] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {entry.speaker[0]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">
                  {entry.speaker}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {entry.timestamp}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{entry.text}</p>
            </div>
          </div>
        ))}

        {/* Live typing indicator */}
        {isRecording && (
          <div className="flex gap-3">
            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mt-0.5 bg-gray-100 text-gray-400">
              ?
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{SAMPLE_TRANSCRIPT.length} 件の発言</span>
          <span>経過時間: 02:05</span>
        </div>
      </div>
    </div>
  );
}
