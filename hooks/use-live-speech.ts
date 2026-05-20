'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type LiveSpeechStatus = 'idle' | 'listening' | 'processing' | 'paused' | 'error';

interface UseLiveSpeechOptions {
  onSpeechEnd?: (text: string) => void;
  onError?: (error: string) => void;
  silenceTimeoutMs?: number;
}

export function useLiveSpeech({
  onSpeechEnd,
  onError,
  silenceTimeoutMs = 1200,
}: UseLiveSpeechOptions = {}) {
  const [status, setStatus] = useState<LiveSpeechStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isErrorCooldownRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>('');

  // Start continuous listening
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = 'Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.';
      setErrorMsg(msg);
      setStatus('error');
      if (onError) onError(msg);
      return;
    }

    // Clean up any existing instances first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    setErrorMsg(null);
    isEnabledRef.current = true;
    isPausedRef.current = false;
    accumulatedTextRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!isErrorCooldownRef.current) {
        setStatus('listening');
      }
    };

    recognition.onresult = (event: any) => {
      if (isPausedRef.current || isErrorCooldownRef.current) return;

      let currentInterim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcriptChunk;
        } else {
          currentInterim += transcriptChunk;
        }
      }

      if (newFinal) {
        accumulatedTextRef.current = (accumulatedTextRef.current + ' ' + newFinal).trim();
        setFinalTranscript(accumulatedTextRef.current);
      }
      setInterimTranscript(currentInterim);

      // Manage silence detection (VAD timeout)
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Only set timer if there is actual finalized or interim content
      if (accumulatedTextRef.current || currentInterim) {
        silenceTimerRef.current = setTimeout(() => {
          handleSilenceDetected();
        }, silenceTimeoutMs);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      console.warn('Speech recognition error event:', err);

      if (err === 'no-speech' || err === 'aborted') {
        // harmless transient or programmatic errors, ignore
        return;
      }

      setErrorMsg(`Recognition error: ${err}`);
      if (onError) onError(err);

      // Handle network errors by cooling down and reconnecting
      if (err === 'network') {
        isErrorCooldownRef.current = true;
        setStatus('error');
        setErrorMsg('Network error. Reconnecting to speech services...');

        try {
          recognition.abort();
        } catch (e) {}

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        setTimeout(() => {
          isErrorCooldownRef.current = false;
          if (isEnabledRef.current && !isPausedRef.current) {
            console.log('Reconnecting speech recognition after cooldown...');
            startListening();
          }
        }, 2000);
      }
    };

    recognition.onend = () => {
      if (isErrorCooldownRef.current) {
        return; // Reconnection timeout will handle it
      }

      // Auto-restart if we should still be active and not paused
      if (isEnabledRef.current && !isPausedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Failed to auto-restart speech recognition, recreating...', e);
          setTimeout(() => {
            if (isEnabledRef.current && !isPausedRef.current) {
              startListening();
            }
          }, 500);
        }
      } else if (isPausedRef.current) {
        setStatus('paused');
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('Error starting SpeechRecognition:', e);
    }
  }, [onError, silenceTimeoutMs]);

  // Handle silence timeout - speech is completed
  const handleSilenceDetected = () => {
    const textToSend = accumulatedTextRef.current.trim();
    
    if (textToSend) {
      setStatus('processing');
      if (onSpeechEnd) {
        onSpeechEnd(textToSend);
      }
      
      accumulatedTextRef.current = '';
      setFinalTranscript('');
      setInterimTranscript('');
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Stop recognition completely
  const stopListening = useCallback(() => {
    isEnabledRef.current = false;
    isPausedRef.current = false;
    isErrorCooldownRef.current = false;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    
    setStatus('idle');
    setFinalTranscript('');
    setInterimTranscript('');
    accumulatedTextRef.current = '';
  }, []);

  // Temporarily pause recognition (e.g. while AI is speaking to prevent feedback)
  const pauseListening = useCallback(() => {
    if (!isEnabledRef.current) return;
    isPausedRef.current = true;
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setStatus('paused');
  }, []);

  // Resume listening (e.g. after AI finishes speaking)
  const resumeListening = useCallback(() => {
    if (!isEnabledRef.current) return;
    isPausedRef.current = false;
    isErrorCooldownRef.current = false;
    setStatus('listening');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Recreate if starting fails
        startListening();
      }
    } else {
      startListening();
    }
  }, [startListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isEnabledRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    status,
    interimTranscript,
    finalTranscript,
    error: errorMsg,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    reset: () => {
      stopListening();
      setErrorMsg(null);
    },
  };
}
