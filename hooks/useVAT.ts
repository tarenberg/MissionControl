'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioAnalyzer } from './useAudioAnalyzer';

function joinSegments(segments: string[]): string {
  if (segments.length === 0) return '';
  
  let result = segments[0].trim();
  
  for (let i = 1; i < segments.length; i++) {
    const nextSegment = segments[i].trim();
    if (!nextSegment) continue;
    
    const cleanResult = result.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNext = nextSegment.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (cleanNext.startsWith(cleanResult)) {
      result = nextSegment;
    } else {
      const endsWithPunctuation = /[.!?]$/.test(result);
      const connector = endsWithPunctuation ? ' ' : ' ';
      result = result + connector + nextSegment;
    }
  }
  
  return result;
}

interface VATOptions {
  threshold?: number; // dB
  silenceDuration?: number; // ms
  onSpeechStart?: () => void;
  onSpeechEnd?: (blob: Blob, transcript?: string) => void;
  disabled?: boolean;
}

export function useVAT(options: VATOptions = {}) {
  const { threshold = -55, silenceDuration = 1500, onSpeechStart, onSpeechEnd, disabled = false } = options;
  const { level, db, error, start: startAnalyzer, stop: stopAnalyzer, stream } = useAudioAnalyzer();
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const transcriptRef = useRef(transcript);

  useEffect(() => { onSpeechStartRef.current = onSpeechStart; }, [onSpeechStart]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const dbRef = useRef(db);
  const thresholdRef = useRef(threshold);
  useEffect(() => { dbRef.current = db; }, [db]);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);

  const stopRecording = useCallback((discard = false) => {
    console.log(`VAT: stopRecording called (discard=${discard}). Current state:`, mediaRecorderRef.current?.state);
    
    setIsSpeaking(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('VAT: Error stopping recognition:', e);
      }
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (discard) {
        // Remove the onstop handler so it doesn't trigger onSpeechEnd
        mediaRecorderRef.current.onstop = () => {
          console.log('VAT: Recording stopped and discarded.');
          setIsSpeaking(false);
          setTranscript('');
        };
      }
      mediaRecorderRef.current.stop();
    } else {
      setTranscript('');
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!stream) {
      console.warn('VAT: No audio stream available to start recording');
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      return;
    }

    try {
      console.log('VAT: Recording starting...', { db: dbRef.current, threshold: thresholdRef.current });
      
      setTranscript(''); // Clear previous transcript

      // Start Speech Recognition for live feedback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const segments: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            segments.push(event.results[i][0].transcript);
          }
          
          const deduplicated = joinSegments(segments);
          setTranscript(deduplicated);
        };

        recognition.onerror = (event: any) => {
          console.error('VAT: Speech recognition error', event.error);
        };

        recognition.onend = () => {
          console.log('VAT: Speech recognition ended');
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';
        
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log('VAT: Audio chunk received:', e.data.size);
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log('VAT: Recording stopped, chunk count:', audioChunksRef.current.length);
        setIsSpeaking(false);
        if (audioChunksRef.current.length === 0) {
          console.error('VAT: No audio chunks captured!');
          setTranscript('');
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const finalText = transcriptRef.current;
        
        // Clear transcript after capturing it
        setTranscript('');

        if (onSpeechEndRef.current) await onSpeechEndRef.current(audioBlob, finalText);
      };

      recorder.start(100); // Send chunks every 100ms
      setIsSpeaking(true);
      if (onSpeechStartRef.current) onSpeechStartRef.current();

    } catch (err) {
      console.error('VAT Recording start failed:', err);
    }
  }, [stream, stopRecording]);

  // Monitor decibel levels for real-time silence detection (VAD)
  useEffect(() => {
    if (!isActive || disabled || !isSpeaking) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    const isUserCurrentlySpeaking = db > threshold;

    if (isUserCurrentlySpeaking) {
      if (silenceTimerRef.current) {
        console.log('VAT: Speech detected (db:', Math.round(db), '). Resetting silence timer.');
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      if (!silenceTimerRef.current) {
        console.log('VAT: Silence detected (db:', Math.round(db), '). Starting silence timer of', silenceDuration, 'ms...');
        silenceTimerRef.current = setTimeout(() => {
          console.log('VAT: Silence duration reached! Stopping recording and submitting.');
          stopRecording();
        }, silenceDuration);
      }
    }
  }, [db, isActive, disabled, isSpeaking, threshold, silenceDuration, stopRecording]);
  
  const toggle = useCallback(async (discardCurrent = false) => {
    console.log('VAT: Toggle called, current isActive:', isActive, 'discard:', discardCurrent);
    if (isActive) {
      stopAnalyzer();
      stopRecording(discardCurrent);
      setIsActive(false);
    } else {
      console.log('VAT: Starting analyzer...');
      await startAnalyzer();
      setIsActive(true);
    }
  }, [isActive, startAnalyzer, stopAnalyzer, stopRecording]);

  // If disabled becomes true, stop active recording
  useEffect(() => {
    if (disabled && isSpeaking) {
      console.log('VAT: Disabled, stopping active recording.');
      stopRecording(true); // discard current recording
    }
  }, [disabled, isSpeaking, stopRecording]);

  // Automatically start recording when analyzer starts and stream is available
  useEffect(() => {
    // Only auto-start VAT recording if Gemini Live is NOT connected
    // This prevents VAT from competing for the stream and closing it.
    const isGeminiLiveConnected = (window as any).isGeminiLiveConnected;
    if (isActive && stream && !isSpeaking && !isGeminiLiveConnected && !disabled) {
      console.log('VAT: Stream available and active, auto-starting recording.');
      startRecording();
    }
  }, [isActive, stream, isSpeaking, startRecording, disabled]);

  return {
    isActive,
    isSpeaking,
    transcript,
    level,
    db,
    error,
    toggle,
    threshold,
    startRecording,
    stopRecording
  };
}
