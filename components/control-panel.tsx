'use client';

interface ControlPanelProps {
  containerTag: string;
  onContainerTagChange: (tag: string) => void;
  selectedVoice: string;
  onVoiceChange: (voiceName: string) => void;
  voices: SpeechSynthesisVoice[];
  onSyncClick: () => void;
  documentsCount: number;
  isLoading: boolean;
}

export function ControlPanel({
  containerTag,
  onContainerTagChange,
  selectedVoice,
  onVoiceChange,
  voices,
  onSyncClick,
  documentsCount,
  isLoading,
}: ControlPanelProps) {
  // Filter voices to include mostly English and clear names
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  const selectVoices = englishVoices.length > 0 ? englishVoices : voices;

  return (
    <div className="flex flex-col p-4 bg-zinc-950/60 border border-zinc-800 rounded-3xl backdrop-blur-md space-y-3">
      <h3 className="text-zinc-100 font-semibold text-xs tracking-wide border-b border-zinc-800 pb-2">
        Workspace Controls
      </h3>

      {/* Container Tag Workspace */}
      <div className="flex flex-col space-y-1">
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Supermemory Space / Tag
        </label>
        <div className="relative">
          <input
            type="text"
            value={containerTag}
            onChange={(e) => onContainerTagChange(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            placeholder="e.g. voice-chat"
          />
          <span className="absolute right-3 top-2.5 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="flex flex-col space-y-1">
        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Assistant AI Voice
        </label>
        <select
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-violet-500 transition appearance-none cursor-pointer"
        >
          <option value="">Default System Voice</option>
          {selectVoices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </div>

      {/* Metadata Info & Refresh */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500">Total Nodes Ingested</span>
          <span className="text-lg font-bold text-violet-400">{documentsCount}</span>
        </div>

        <button
          onClick={onSyncClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-3.5 w-3.5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          )}
          Refresh Graph
        </button>
      </div>
    </div>
  );
}
