'use client';

interface VoiceAvatarProps {
  status: 'idle' | 'listening' | 'processing' | 'paused' | 'error';
  isSpeaking: boolean;
  onMicClick: () => void;
}

export function VoiceAvatar({ status, isSpeaking, onMicClick }: VoiceAvatarProps) {
  let statusText = 'Click to Talk';
  let ringClass = 'border-violet-500/20';
  let glowClass = 'shadow-[0_0_20px_rgba(139,92,246,0.1)] bg-zinc-900 hover:bg-zinc-850 border border-zinc-800';
  let rippleColor = 'rgba(139, 92, 246, 0.3)';

  const isListening = status === 'listening';
  const isThinking = status === 'processing';
  const isVoiceActive = isSpeaking || status === 'paused';

  if (isListening) {
    statusText = 'Live Listening...';
    ringClass = 'border-violet-500/50 animate-pulse';
    glowClass = 'shadow-[0_0_30px_rgba(139,92,246,0.45)] bg-gradient-to-tr from-violet-650 to-indigo-650';
    rippleColor = 'rgba(124, 58, 237, 0.35)';
  } else if (isThinking) {
    statusText = 'Thinking...';
    ringClass = 'border-amber-500/50 border-t-transparent animate-spin';
    glowClass = 'shadow-[0_0_25px_rgba(245,158,11,0.3)] bg-amber-500';
  } else if (isVoiceActive) {
    statusText = 'Speaking...';
    ringClass = 'border-emerald-500/40 animate-pulse';
    glowClass = 'shadow-[0_0_35px_rgba(16,185,129,0.5)] bg-emerald-500';
    rippleColor = 'rgba(16, 185, 129, 0.4)';
  } else if (status === 'error') {
    statusText = 'Service Error';
    ringClass = 'border-rose-600/50';
    glowClass = 'shadow-[0_0_20px_rgba(225,29,72,0.3)] bg-rose-650';
    rippleColor = 'rgba(225, 29, 72, 0.2)';
  }

  const isPulsing = isListening || isVoiceActive || status === 'error';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 border border-zinc-900 rounded-3xl backdrop-blur-md shrink-0">
      <div className="relative flex items-center justify-center w-36 h-36">
        
        {/* Animated ripples for active states */}
        {isPulsing && (
          <>
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-75"
              style={{ 
                backgroundColor: rippleColor, 
                animationDuration: isListening ? '1.5s' : '2s',
              }}
            />
            <div 
              className="absolute -inset-2 rounded-full animate-pulse opacity-40"
              style={{ 
                border: `2px solid ${rippleColor}`,
              }}
            />
          </>
        )}

        {/* Outer border status ring */}
        <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${ringClass}`} />

        {/* Core Interactive Glowing Orb */}
        <button
          type="button"
          onClick={onMicClick}
          disabled={isThinking}
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed ${glowClass}`}
          aria-label={isListening ? 'Stop session' : 'Start session'}
        >
          {isListening ? (
            // Stop Icon (red record square)
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9z" />
            </svg>
          ) : isThinking ? (
            // Spinner Icon
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            // Mic Icon
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-zinc-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 0 3-3V4.5a3 3 0 0 0-6 0v8.25a3 3 0 0 0 3 3Z" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-zinc-300 text-xs font-bold tracking-wider uppercase">{statusText}</p>
        {isListening && (
          <p className="text-[10px] text-violet-400/80 mt-1 animate-pulse">Hands-free active • speak to AI</p>
        )}
        {status === 'idle' && (
          <p className="text-[10px] text-zinc-500 mt-1">Click the microphone to start talking</p>
        )}
        {isVoiceActive && (
          <p className="text-[10px] text-emerald-400 mt-1 animate-pulse">Voice Assistant is responding</p>
        )}
        {status === 'error' && (
          <p className="text-[10px] text-rose-400 mt-1">Mic error or network dropout. Retrying...</p>
        )}
      </div>
    </div>
  );
}
