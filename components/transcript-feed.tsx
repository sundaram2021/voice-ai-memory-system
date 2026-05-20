'use client';

import { useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TranscriptFeedProps {
  messages: Message[];
  status: 'idle' | 'listening' | 'processing' | 'paused' | 'error';
  isSpeaking: boolean;
  interimTranscript?: string;
}

export function TranscriptFeed({ messages, status, isSpeaking, interimTranscript }: TranscriptFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when messages or active states change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, status, isSpeaking, interimTranscript]);

  const isThinking = status === 'processing';
  const isVoiceActive = isSpeaking || status === 'paused';

  return (
    <div className="flex flex-col flex-1 min-h-[220px] lg:min-h-0 bg-zinc-950/60 border border-zinc-900 rounded-3xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-900 bg-zinc-900/50">
        <h3 className="text-zinc-200 font-bold text-xs tracking-wider uppercase">Live Transcription Feed</h3>
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
        </span>
      </div>

      {/* Messages list */}
      <div 
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-zinc-650">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-3 opacity-40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5m0 3h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Channel Silent</p>
            <p className="text-[10px] text-zinc-600 mt-1">Start speaking to stream audio memories</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              {/* Message Bubble */}
              <div 
                className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-violet-650 to-indigo-650 text-white rounded-br-none shadow-[0_4px_12px_rgba(124,58,237,0.15)]'
                    : 'bg-zinc-900 text-zinc-300 rounded-bl-none border border-zinc-800'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 px-1">
                {msg.role === 'user' ? 'User' : 'Assistant'}
              </span>
            </div>
          ))
        )}

        {/* Render interim user speech in real-time */}
        {interimTranscript && (
          <div className="flex flex-col max-w-[85%] ml-auto items-end animate-pulse">
            <div className="px-4 py-2.5 rounded-2xl text-xs leading-relaxed bg-gradient-to-r from-violet-650/80 to-indigo-650/80 text-white/95 rounded-br-none italic border border-violet-500/25 shadow-[0_4px_10px_rgba(124,58,237,0.1)]">
              {interimTranscript}
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 px-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-ping" />
              Speaking...
            </span>
          </div>
        )}

        {/* Live Loading/Processing indicators */}
        {isThinking && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zinc-900/50 text-zinc-400 border border-zinc-850 rounded-bl-none">
              <span className="text-xs">AI thinking...</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-550 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-550 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-550 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {isVoiceActive && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-950/20 text-emerald-450 border border-emerald-900/20 rounded-bl-none">
              <span className="text-[10px] uppercase font-bold tracking-wider">AI Speaking</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
