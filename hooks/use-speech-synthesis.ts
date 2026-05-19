'use client';

import { useState, useRef, useEffect } from 'react';

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

  const speak = (text: string, voiceName?: string) => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synth.cancel(); // Cancel any ongoing speech

    if (!text) return;

    // Filter out simple symbols to make reading cleaner
    const cleanedText = text
      .replace(/[*_#`~[\]()]/g, '') // remove markdown symbols
      .replace(/https?:\/\/[^\s]+/g, 'link'); // replace URLs with "link"

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    if (voiceName) {
      const selectedVoice = voices.find((v) => v.name === voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    } else {
      // Find a high-quality default voice, preferably English
      const defaultVoice = 
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Microsoft')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (defaultVoice) utterance.voice = defaultVoice;
    }

    utterance.rate = 1.05; // slightly faster for a modern assistant feel
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      // Don't log if it was cancelled, which is a normal state
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
    setIsSpeaking(false);
  };

  return {
    isSpeaking,
    voices,
    speak,
    stop,
  };
}
