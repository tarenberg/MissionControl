'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioAnalyzer() {
  const [level, setLevel] = useState(0); 
  const [db, setDb] = useState(-90);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Security Warning
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      console.warn('VAT: Not in a secure context. Microphone may be muted by browser.');
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      
      const track = mediaStream.getAudioTracks()[0];
      console.log('VAT: Mic Track Info:', {
        label: track.label,
        muted: track.muted,
        enabled: track.enabled,
        state: track.readyState
      });

      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;

      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const source = ctx.createMediaStreamSource(mediaStream);
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.fftSize);

      const update = () => {
        if (!analyzerRef.current) return;
        
        // Use Time Domain for more direct volume calculation
        analyzerRef.current.getByteTimeDomainData(dataArray);
        
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const amplitude = (dataArray[i] - 128) / 128;
          sumSquares += amplitude * amplitude;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        // Map RMS to dB
        const currentDb = rms > 0 ? 20 * Math.log10(rms) : -90;
        
        // Boosted level for UI
        const currentLevel = Math.max(0, Math.min(1, rms * 50));

        setDb(currentDb);
        setLevel(currentLevel);

        if (Math.random() < 0.01) {
          console.log('VAT LIVE:', { db: Math.round(currentDb), ctx: ctx.state });
        }

        animationFrameRef.current = requestAnimationFrame(update);
      };

      update();
      setError(null);
    } catch (err: any) {
      console.error('VAT Error:', err);
      setError(err.message || 'Mic access failed');
    }
  }, []);

  const stop = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    
    audioContextRef.current = null;
    analyzerRef.current = null;
    setStream(null);
    setLevel(0);
    setDb(-90);
  }, [stream]);

  useEffect(() => {
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return { level, db, error, start, stop, stream };
}
