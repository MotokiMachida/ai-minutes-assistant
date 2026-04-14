import { useState, useCallback } from 'react';
import { FileText, Clock, Users } from 'lucide-react';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { AnalysisPanel } from './components/AnalysisPanel';

export interface MeetingInfo {
  title: string;
  date: string;
  time: string;
  participants: string;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function App() {
  const [transcriptText, setTranscriptText] = useState('');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo>({
    title: '',
    date: todayDate(),
    time: nowTime(),
    participants: '',
  });

  const handleTranscriptUpdate = useCallback((text: string) => {
    setTranscriptText(text);
  }, []);

  const set = (key: keyof MeetingInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMeetingInfo((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans">
      {/* Top Navigation */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">AI Minutes Assistant</h1>
            <p className="text-xs text-gray-400 leading-tight">議事録自動生成システム</p>
          </div>
        </div>

        {/* Meeting info inputs */}
        <div className="flex items-center gap-3 flex-1 justify-end flex-wrap">
          <input
            type="text"
            value={meetingInfo.title}
            onChange={set('title')}
            placeholder="会議名を入力..."
            className="text-sm font-semibold bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 w-52 text-gray-700 placeholder:text-gray-300"
          />
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <input
              type="date"
              value={meetingInfo.date}
              onChange={set('date')}
              className="bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 text-xs text-gray-600"
            />
            <input
              type="time"
              value={meetingInfo.time}
              onChange={set('time')}
              className="bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 text-xs text-gray-600"
            />
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <input
              type="text"
              value={meetingInfo.participants}
              onChange={set('participants')}
              placeholder="参加者（カンマ区切り）"
              className="bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 text-xs text-gray-600 placeholder:text-gray-300 w-44"
            />
          </span>
        </div>
      </header>

      {/* Main Content — 2-column split layout */}
      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200">
          <TranscriptionPanel onTranscriptUpdate={handleTranscriptUpdate} />
        </section>
        <section className="w-96 flex-shrink-0 flex flex-col bg-white xl:w-[420px]">
          <AnalysisPanel transcriptText={transcriptText} meetingInfo={meetingInfo} />
        </section>
      </main>
    </div>
  );
}

export default App;
