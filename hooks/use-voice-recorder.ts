'use client';

import { useState, useRef, useEffect } from 'react';

export type RecorderStatus = 'idle' | 'recording' | 'transcribing' | 'success' | 'error';

interface UseVoiceRecorderOptions {
  onTranscriptReady?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder({ onTranscriptReady, onError }: UseVoiceRecorderOptions = {}) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [volume, setVolume] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecordingResources();
    };
  }, []);

  const stopRecordingResources = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setVolume(0);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analysis for volume visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Monitor volume levels
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Map average volume to a 0-100 scale (normal voice is typically around 30-70 in this setup)
        const mappedVolume = Math.min(100, Math.round((average / 128) * 100));
        setVolume(mappedVolume);
        
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      
      checkVolume();

      // Setup media recorder
      // Choose supported format (WebM is widely supported, fallback to default)
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/ogg' };
      }
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopRecordingResources();
        setStatus('transcribing');

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (audioBlob.size === 0) {
          setStatus('idle');
          return;
        }

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-recording.webm');

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to transcribe audio');
          }

          const { transcript } = await response.json();
          
          if (!transcript || transcript.trim() === '') {
            setStatus('idle');
            return;
          }

          setStatus('success');
          if (onTranscriptReady) {
            onTranscriptReady(transcript);
          }
        } catch (err: any) {
          console.error('Transcription error:', err);
          setErrorMsg(err.message || 'Error occurred during transcription');
          setStatus('error');
          if (onError) {
            onError(err.message || 'Error occurred during transcription');
          }
        }
      };

      mediaRecorder.start(100); // chunk every 100ms
      setStatus('recording');
    } catch (err: any) {
      console.error('Failed to get media devices:', err);
      const msg = err.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please enable mic access in your browser settings.'
        : err.message || 'Could not access microphone.';
      setErrorMsg(msg);
      setStatus('error');
      if (onError) onError(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    status,
    volume,
    error: errorMsg,
    startRecording,
    stopRecording,
    reset: () => {
      setStatus('idle');
      setErrorMsg(null);
      setVolume(0);
    }
  };
}
