'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      if (typeof window === 'undefined') return;
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const queueRef = useRef<{ text: string; voiceName?: string }[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);
  const activeVoiceNameRef = useRef<string | null>(null);
  const processQueueRef = useRef<() => void>(() => {});

  const processQueue = useCallback(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;

    if (queueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingQueueRef.current = true;
    setIsSpeaking(true);
    const { text, voiceName } = queueRef.current.shift()!;

    // Clean text
    const cleanedText = text
      .replace(/[*_#`~[\]()]/g, '') // remove markdown symbols
      .replace(/https?:\/\/[^\s]+/g, 'link'); // replace URLs with "link"

    if (!cleanedText.trim()) {
      // Process next in queue
      processQueueRef.current();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    const activeVoice = voiceName || activeVoiceNameRef.current || undefined;
    if (activeVoice) {
      const selectedVoice = voices.find((v) => v.name === activeVoice);
      if (selectedVoice) utterance.voice = selectedVoice;
    } else {
      const defaultVoice = 
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
      if (defaultVoice) utterance.voice = defaultVoice;
    }

    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      processQueueRef.current();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech Synthesis Error:', e);
      }
      processQueueRef.current();
    };

    synth.speak(utterance);
  }, [voices]);

  // Keep recursive reference synced to prevent linter block
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  const speakSentence = useCallback((text: string, voiceName?: string) => {
    if (typeof window === 'undefined') return;
    if (!text || !text.trim()) return;

    if (voiceName) {
      activeVoiceNameRef.current = voiceName;
    }

    queueRef.current.push({ text, voiceName });

    if (!isPlayingQueueRef.current) {
      processQueue();
    }
  }, [processQueue]);

  const speak = (text: string, voiceName?: string) => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synth.cancel(); // Cancel any ongoing speech
    
    // Clear queue
    queueRef.current = [];
    isPlayingQueueRef.current = false;
    activeVoiceNameRef.current = voiceName || null;

    if (!text) {
      setIsSpeaking(false);
      return;
    }

    const cleanedText = text
      .replace(/[*_#`~[\]()]/g, '') // remove markdown symbols
      .replace(/https?:\/\/[^\s]+/g, 'link'); // replace URLs with "link"

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    if (voiceName) {
      const selectedVoice = voices.find((v) => v.name === voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    } else {
      const defaultVoice = 
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (defaultVoice) utterance.voice = defaultVoice;
    }

    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech Synthesis Error:', e);
      }
      setIsSpeaking(false);
    };

    synth.speak(utterance);
  };

  const stop = () => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isPlayingQueueRef.current = false;
    setIsSpeaking(false);
  };

  return {
    isSpeaking,
    voices,
    speak,
    speakSentence,
    stop,
  };
}

