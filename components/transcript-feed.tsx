'use client';

import { useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TranscriptFeedProps {
  messages: Message[];
  status: 'idle' | 'recording' | 'transcribing' | 'success' | 'error';
  isSpeaking: boolean;
}

export function TranscriptFeed({ messages, status, isSpeaking }: TranscriptFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when messages or active states change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, status, isSpeaking]);

  return (
    <div className="flex flex-col flex-1 min-h-[200px] lg:min-h-0 bg-zinc-950/60 border border-zinc-800 rounded-3xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <h3 className="text-zinc-100 font-semibold text-xs tracking-wide">Live Conversation Log</h3>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
        </span>
      </div>

      {/* Messages list */}
      <div 
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-3 opacity-60">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5m0 3h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-zinc-600 mt-1">Start speaking to begin the memory session</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              {/* Message Bubble */}
              <div 
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none shadow-[0_4px_12px_rgba(124,58,237,0.15)]'
                    : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700/50'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 px-1">
                {msg.role === 'user' ? 'You' : 'Voice Assistant'}
              </span>
            </div>
          ))
        )}

        {/* Live Loading/Processing indicators */}
        {status === 'transcribing' && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-zinc-800/50 text-zinc-400 border border-zinc-800 rounded-bl-none">
              <span className="text-xs">Transcribing voice...</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {status === 'success' && isSpeaking && (
          <div className="flex flex-col items-start mr-auto max-w-[80%]">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-bl-none">
              <span className="text-xs">Generating speech...</span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
