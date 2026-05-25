'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVAD } from './useVAD';

// Helper function to join transcript segments from the SpeechRecognition API
function joinSegments(segments: string[]): string {
  // ... (keeping the existing robust joinSegments logic)
  if (segments.length === 0) return '';
  const cleanedSegments = segments.map((seg, idx) => {
    let s = seg.trim();
    if (idx < segments.length - 1) {
      s = s.replace(/[.,?!]+$/, '');
    }
    return s;
  });
  let result = cleanedSegments[0];
  for (let i = 1; i < cleanedSegments.length; i++) {
    const nextSegment = cleanedSegments[i];
    if (!nextSegment) continue;
    const cleanResult = result.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNext = nextSegment.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanNext.startsWith(cleanResult)) {
      result = nextSegment;
    } else {
      result = result + ' ' + nextSegment;
    }
  }
  return result;
}

// Helper function to convert the Float32Array from VAD to a WAV blob
function float32ToWavBlob(audioData: Float32Array, sampleRate = 16000): Blob {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const numSamples = audioData.length;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM

  // RIFF identifier
  view.setBigUint64(0, BigInt(0x5249464600000000), false);
  // file length
  view.setUint32(4, 36 + numSamples * numChannels * bytesPerSample, true);
  // RIFF type
  view.setBigUint64(8, BigInt(0x57415645666d7420), false);
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 for PCM)
  view.setUint16(20, 1, true);
  // number of channels
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  // block align (num channels * bytes per sample)
  view.setUint16(32, numChannels * bytesPerSample, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setBigUint64(36, BigInt(0x6461746100000000), false);
  // data chunk length
  view.setUint32(40, numSamples * numChannels * bytesPerSample, true);

  // Convert Float32 to 16-bit PCM
  const pcm = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const blob = new Blob([view, pcm], { type: 'audio/wav' });
  return blob;
}

interface VATOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: (blob: Blob, transcript?: string) => void;
  onTranscript?: (text: string) => void;
  onPreviewAudio?: (blob: Blob) => void;
  forcePreviewFallback?: boolean;
  disabled?: boolean;
}

export function useVAT(options: VATOptions = {}) {
  const { onSpeechStart, onSpeechEnd, onTranscript, disabled = false } = options;

  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onTranscriptRef = useRef(onTranscript);
  const transcriptRef = useRef(transcript);

  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // VAD Speech Start Handler
  const handleSpeechStart = useCallback(() => {
    console.log('VAD detected speech start. Starting recognition...');
    setTranscript(''); // Clear previous transcript

    // Call the UI's onSpeechStart callback
    onSpeechStart?.();

    // Start browser speech recognition for live transcript
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechRecognitionAvailable(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const segments: string[] = Array.from(event.results).map((result: any) => result[0].transcript);
        const joined = joinSegments(segments);
        setTranscript(joined);
        onTranscriptRef.current?.(joined);
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setSpeechRecognitionAvailable(false);
      };
      recognition.onend = () => console.log('Speech recognition ended.');
      
      recognitionRef.current = recognition;
      recognition.start();
    } else {
      setSpeechRecognitionAvailable(false);
    }
  }, [onSpeechStart]);

  // VAD Speech End Handler
  const handleSpeechEnd = useCallback((audio: Float32Array) => {
    console.log('VAD detected speech end. Stopping recognition and processing audio.');
    
    // Stop the speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Convert the raw audio data to a WAV blob
    const audioBlob = float32ToWavBlob(audio);
    
    const finalText = transcriptRef.current;
    
    // Fire the final onSpeechEnd event for the UI
    if (onSpeechEndRef.current) {
      onSpeechEndRef.current(audioBlob, finalText);
    }
    
    // Reset the transcript
    setTranscript('');
  }, []);

  // Initialize the new VAD hook
  const { 
    isReady: isVADReady, 
    isSpeaking, 
    error: vadError, 
    start: startVAD, 
    stop: stopVAD 
  } = useVAD({
    onSpeechStart: handleSpeechStart,
    onSpeechEnd: handleSpeechEnd,
  });

  const stopVat = useCallback(() => {
    stopVAD();
    setIsActive(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [stopVAD]);

  // Main toggle function for the UI to call
  const toggle = useCallback(async (discard?: boolean) => {
    if (isActive) {
      console.log('VAT: Toggling OFF');
      stopVat();
    } else {
      console.log('VAT: Toggling ON');
      await startVAD();
      setIsActive(true);
    }
  }, [isActive, startVAD, stopVat]);

  // Effect to handle the disabled prop
  useEffect(() => {
    if (disabled && isActive) {
      console.log('VAT: Disabled, stopping active session.');
      stopVat();
    }
  }, [disabled, isActive, stopVat]);

  return {
    isActive,
    isSpeaking,
    transcript,
    speechRecognitionAvailable,
    error: vadError,
    toggle,
    // Deprecated values, kept for compatibility
    level: 0,
    db: -90,
    threshold: 0,
    // Keep start/stop recording as no-ops for compatibility
    startRecording: () => console.warn('startRecording is now handled automatically by VAD.'),
    stopRecording: (discard?: boolean) => {
      console.log(`stopRecording called (discard=${discard}). Stopping VAD.`);
      stopVat();
    },
  };
}
