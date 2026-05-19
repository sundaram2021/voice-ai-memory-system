'use client';

interface VoiceAvatarProps {
  status: 'idle' | 'recording' | 'transcribing' | 'success' | 'error';
  volume: number;
  isSpeaking: boolean;
  onMicClick: () => void;
}

export function VoiceAvatar({ status, volume, isSpeaking, onMicClick }: VoiceAvatarProps) {
  // Compute size increase based on microphone volume (0 to 100)
  const volumeScale = 1 + (volume / 100) * 0.4;
  
  // Outer ring colors and animations based on state
  let statusText = 'Ready to Talk';
  let ringClass = 'border-violet-500/30';
  let glowClass = 'shadow-[0_0_20px_rgba(139,92,246,0.15)] bg-violet-600';
  let rippleColor = 'rgba(139, 92, 246, 0.4)';

  if (status === 'recording') {
    statusText = 'Listening...';
    ringClass = 'border-red-500/50 animate-pulse';
    glowClass = 'shadow-[0_0_30px_rgba(239,68,68,0.4)] bg-red-500';
    rippleColor = 'rgba(239, 68, 68, 0.3)';
  } else if (status === 'transcribing') {
    statusText = 'Thinking...';
    ringClass = 'border-amber-500/50 border-t-transparent animate-spin';
    glowClass = 'shadow-[0_0_25px_rgba(245,158,11,0.3)] bg-amber-500';
  } else if (isSpeaking) {
    statusText = 'Speaking...';
    ringClass = 'border-emerald-500/40 animate-pulse';
    glowClass = 'shadow-[0_0_35px_rgba(16,185,129,0.5)] bg-emerald-500';
    rippleColor = 'rgba(16, 185, 129, 0.4)';
  } else if (status === 'error') {
    statusText = 'Mic Error';
    ringClass = 'border-rose-600/50';
    glowClass = 'shadow-[0_0_20px_rgba(225,29,72,0.3)] bg-rose-600';
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur-md">
      <div className="relative flex items-center justify-center w-36 h-36">
        
        {/* Animated ripples for active states (recording or speaking) */}
        {(status === 'recording' || isSpeaking) && (
          <>
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-75"
              style={{ 
                backgroundColor: rippleColor, 
                animationDuration: status === 'recording' ? '1.5s' : '2s',
                transform: `scale(${volumeScale})`
              }}
            />
            <div 
              className="absolute -inset-2 rounded-full animate-pulse opacity-40"
              style={{ 
                border: `2px solid ${rippleColor}`,
                transform: `scale(${volumeScale * 1.05})`
              }}
            />
          </>
        )}

        {/* Outer border status ring */}
        <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${ringClass}`} />

        {/* Core Interactive Glowing Orb */}
        <button
          onClick={onMicClick}
          disabled={status === 'transcribing'}
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed ${glowClass}`}
          style={{ transform: `scale(${volumeScale})` }}
          aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {status === 'recording' ? (
            // Stop Icon (red record square)
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9z" />
            </svg>
          ) : status === 'transcribing' ? (
            // Spinner Icon
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            // Mic Icon
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3V4.5a3 3 0 0 0-6 0v8.25a3 3 0 0 0 3 3Z" />
            </svg>
          )}
          
          {/* Subtle volume amplitude bar animation when recording */}
          {status === 'recording' && (
            <div className="absolute bottom-4 flex items-center justify-center gap-0.5 h-3">
              <span className="w-0.5 bg-white/70 rounded-full transition-all" style={{ height: `${Math.max(3, volume * 0.08)}px` }} />
              <span className="w-0.5 bg-white/90 rounded-full transition-all" style={{ height: `${Math.max(3, volume * 0.12)}px` }} />
              <span className="w-0.5 bg-white/70 rounded-full transition-all" style={{ height: `${Math.max(3, volume * 0.08)}px` }} />
            </div>
          )}
        </button>
      </div>

      <div className="mt-2 text-center">
        <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase">{statusText}</p>
        {status === 'recording' && (
          <p className="text-[10px] text-zinc-500 mt-0.5">Speak now • click to finish</p>
        )}
        {status === 'idle' && (
          <p className="text-[10px] text-zinc-500 mt-0.5">Click mic to start speaking</p>
        )}
        {isSpeaking && (
          <p className="text-[10px] text-emerald-400 mt-0.5 animate-pulse">Voice Assistant is responding</p>
        )}
      </div>
    </div>
  );
}
