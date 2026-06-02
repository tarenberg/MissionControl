'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import { MicVAD, RealTimeVADOptions } from '@ricky0123/vad-web';

interface UseVADOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onSpeaking?: (speaking: boolean) => void;
  startOnLoad?: boolean;
}

export function useVAD(options: UseVADOptions = {}) {
  const { onSpeechStart, onSpeechEnd, onSpeaking, startOnLoad = false } = options;
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeakingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vadRef = useRef<MicVAD | null>(null);

  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeakingRef = useRef(onSpeaking);

  useEffect(() => { onSpeechStartRef.current = onSpeechStart; }, [onSpeechStart]);
  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onSpeakingRef.current = onSpeaking; }, [onSpeaking]);

  const start = useCallback(async () => {
    if (vadRef.current) {
      console.log('VAD is already running.');
      return;
    }

    try {
      console.log('Initializing VAD...');
      const vad = await MicVAD.new({
        // Silero VAD does not require an explicit onnxURL in recent versions
        // as it bundles the model. If issues arise, a path to a model in /public
        // might be needed, e.g., onnxURL: "/models/silero_vad.onnx"
        
        onSpeechStart: () => {
          console.log('VAD: Speech started');
          setIsSpeakingState(true);
          onSpeakingRef.current?.(true);
          onSpeechStartRef.current?.();
        },
        onSpeechEnd: (audio: Float32Array) => {
          console.log('VAD: Speech ended');
          setIsSpeakingState(false);
          onSpeakingRef.current?.(false);
          onSpeechEndRef.current?.(audio);
        },
        // Using a higher positive speech threshold to filter out more noise
        positiveSpeechThreshold: 0.7,
        // Using a lower negative speech threshold to be more forgiving of pauses
        negativeSpeechThreshold: 0.35,


      });

      vadRef.current = vad;
      vad.start();
      setIsReady(true);
      console.log('VAD started successfully.');
    } catch (e: any) {
      console.error('Failed to initialize or start VAD:', e);
      setError(e.message || 'VAD initialization failed.');
    }
  }, []);

  const stop = useCallback(() => {
    if (vadRef.current) {
      console.log('Stopping VAD...');
      vadRef.current.pause();
      vadRef.current = null;
      setIsReady(false);
      setIsSpeakingState(false);
      onSpeakingRef.current?.(false);
    }
  }, []);

  useEffect(() => {
    if (startOnLoad) {
      start();
    }
    // Cleanup on unmount
    return () => {
      stop();
    };
  }, [startOnLoad, start, stop]);

  return { isReady, isSpeaking, error, start, stop };
}
