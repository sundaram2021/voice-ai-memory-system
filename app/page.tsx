'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { useGraphSync } from '@/hooks/use-graph-sync';
import { useLiveSpeech } from '@/hooks/use-live-speech';
import { VoiceAvatar } from '@/components/voice-avatar';
import { TranscriptFeed } from '@/components/transcript-feed';

// Load MemoryGraph dynamically to prevent SSR errors (since it uses Canvas APIs)
const MemoryGraph = dynamic(
  () => import('@supermemory/memory-graph').then((mod) => mod.MemoryGraph),
  { ssr: false }
);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function GraphPage() {
  const containerTag = 'voice-chat';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessingChat, setIsProcessingChat] = useState<boolean>(false);

  // Sync graph state and optimistic nodes
  const {
    documents,
    isLoading: isGraphLoading,
    refetch,
    addOptimisticUserNode,
    updateOptimisticAiNode,
  } = useGraphSync(containerTag);

  // Browser Text-To-Speech hook
  const { speakSentence, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis();

  // Continuous Live Speech-To-Text hook
  const {
    status: liveSpeechStatus,
    interimTranscript,
    error: liveSpeechError,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
  } = useLiveSpeech({
    onSpeechEnd: handleLiveUserSpeech,
    onError: (err) => console.error('Live Speech Error:', err),
    silenceTimeoutMs: 1200,
  });

  // Manage automatic microphone pausing/resuming based on assistant speaking status
  useEffect(() => {
    if (isSpeaking) {
      pauseListening();
    } else if (liveSpeechStatus === 'paused') {
      resumeListening();
    }
  }, [isSpeaking, liveSpeechStatus, pauseListening, resumeListening]);

  // Handle when live voice is completed (Hands-Free Live Mode)
  async function handleLiveUserSpeech(transcript: string) {
    if (!transcript.trim()) return;

    // Stop assistant from speaking immediately (barge-in interruption)
    stopSpeaking();

    // Append user message to logs
    const userMsg: ChatMessage = { role: 'user', content: transcript };
    setMessages((prev) => [...prev, userMsg]);

    // Optimistically draw a user node immediately
    const docId = addOptimisticUserNode(transcript);

    setIsProcessingChat(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          history: messages,
          containerTag: containerTag,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get streaming response from AI');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream reader available');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sentenceBuffer = '';

      // Append empty assistant message for streaming display
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const dataObj = JSON.parse(dataStr);
            if (dataObj.type === 'content_block_delta' && dataObj.delta?.text) {
              const newText = dataObj.delta.text;
              accumulatedText += newText;
              sentenceBuffer += newText;

              // Update logs in real-time
              setMessages((prev) => {
                const next = [...prev];
                if (next.length > 0) {
                  next[next.length - 1] = {
                    role: 'assistant',
                    content: accumulatedText,
                  };
                }
                return next;
              });

              // Update memory graph canvas in real-time
              updateOptimisticAiNode(docId, accumulatedText);

              // Process sentence boundaries for TTS queuing
              const matches = sentenceBuffer.match(/[^.!?]+[.!?]/g);
              if (matches) {
                for (const match of matches) {
                  speakSentence(match.trim());
                  sentenceBuffer = sentenceBuffer.replace(match, '');
                }
              }
            }
          } catch (e) {
            // Ignore parse errors on SSE delimiters
          }
        }
      }

      // Speak remaining text in sentence buffer
      if (sentenceBuffer.trim()) {
        speakSentence(sentenceBuffer.trim());
      }

      // Schedule background graph sync in 6 seconds to fetch permanent nodes
      setTimeout(() => {
        refetch();
      }, 6000);

    } catch (error) {
      console.error('Error in live chat stream:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error communicating with my neural processors. Please try speaking again.' },
      ]);
    } finally {
      setIsProcessingChat(false);
    }
  }

  // Toggle voice capture state when clicking the glowing mic orb
  function handleMicToggle() {
    stopSpeaking();

    if (liveSpeechStatus === 'listening' || liveSpeechStatus === 'paused') {
      stopListening();
    } else {
      startListening();
    }
  }

  // Map system status
  const currentStatus = isProcessingChat ? 'processing' : liveSpeechStatus;

  return (
    <div className="flex flex-col min-h-screen lg:h-screen bg-black text-zinc-100 font-sans antialiased lg:overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <header className="relative z-10 border-b border-zinc-950 bg-zinc-950/40 backdrop-blur-md px-6 py-3 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 text-white">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
              Voice Memory AI
            </h1>
            <p className="text-[9px] text-zinc-500 font-medium">Hands-free Live Talking Mode</p>
          </div>
        </div>

        {/* Connection status tag */}
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/80 border border-zinc-800 rounded-full text-[10px] text-zinc-400">
          <span className={`h-1.5 w-1.5 rounded-full ${liveSpeechStatus === 'listening' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-650'}`} />
          Status: <span className="text-violet-400 font-semibold uppercase">{liveSpeechStatus}</span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-6 lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:overflow-hidden w-full max-w-[1600px] mx-auto">
        
        {/* Left Side: Voice Assistant Controls & Logs */}
        <section className="lg:col-span-4 flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
          <VoiceAvatar
            status={currentStatus}
            isSpeaking={isSpeaking}
            onMicClick={handleMicToggle}
          />

          <TranscriptFeed
            messages={messages}
            status={currentStatus}
            isSpeaking={isSpeaking}
            interimTranscript={liveSpeechStatus === 'listening' ? interimTranscript : ''}
          />

          {liveSpeechError && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-2xl text-[10px] text-rose-400 leading-relaxed shrink-0">
              <span className="font-semibold block mb-0.5">Voice Service Note:</span>
              {liveSpeechError}
            </div>
          )}
        </section>

        {/* Right Side: Interactive Memory Graph Canvas */}
        <section className="lg:col-span-8 flex flex-col bg-zinc-950/40 border border-zinc-900 rounded-3xl backdrop-blur-md overflow-hidden lg:h-full lg:min-h-0 relative">
          
          {/* Graph Heading */}
          <div className="px-6 py-3 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between z-10 shrink-0">
            <div>
              <h2 className="text-xs font-semibold text-zinc-200">Interactive Memory Graph</h2>
              <p className="text-[9px] text-zinc-500 mt-0.5">
                Rectangles represent ingested documents; hexagons represent extracted memories.
              </p>
            </div>
            {isGraphLoading && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <svg className="animate-spin h-3.5 w-3.5 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </span>
            )}
          </div>

          {/* Graph Canvas Container */}
          <div className="flex-1 w-full h-[400px] lg:h-full min-h-0 relative bg-zinc-950">
            <MemoryGraph
              documents={documents}
              isLoading={isGraphLoading}
              variant="console"
            />
          </div>
          
          {/* Legend Banner */}
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-[10px] text-zinc-400 flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-1.5 bg-violet-600 rounded-sm" /> Document
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rotate-45 bg-indigo-500" /> Memory
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-[9px] text-zinc-500">Scroll to zoom, drag to pan graph</span>
          </div>
        </section>

      </main>
    </div>
  );
}
