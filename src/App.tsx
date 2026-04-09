import { FileText, Clock, Users, Settings } from 'lucide-react';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { AnalysisPanel } from './components/AnalysisPanel';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans">
      {/* Top Navigation */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              AI Minutes Assistant
            </h1>
            <p className="text-xs text-gray-400 leading-tight">
              議事録自動生成システム
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              週次定例ミーティング
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              3名参加
            </span>
          </div>
          <div className="hidden md:block w-px h-5 bg-gray-200" />
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content — 2-column split layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Real-time Transcription */}
        <section className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
          <TranscriptionPanel />
        </section>

        {/* Right: AI Analysis */}
        <section className="w-96 flex-shrink-0 flex flex-col bg-white xl:w-[420px]">
          <AnalysisPanel />
        </section>
      </main>
    </div>
  );
}

export default App;
