"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import VoiceOrb, { OrbState } from './VoiceOrb';
import { GoogleGenAI, Modality } from '@google/genai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

// --- Helpers ---

function float32ToPcmBase64(data: Float32Array): string {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pcmToAudioBuffer(data: Uint8Array, ctx: AudioContext, sampleRate: number): AudioBuffer {
  const int16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, int16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < int16.length; i++) {
    channelData[i] = int16[i] / 32768.0;
  }
  return buffer;
}

const systemInstruction = `You are Muffin, a creative AI assistant integrated into the Mission Control dashboard for an artist named Tom. 

Your purpose is to provide quick, hands-free assistance.

Current context about the workspace:
- Project: "Odyssey" - A series of large-scale digital paintings.
- Key Artworks in progress: "The Crimson Nebula", "Solar Flare", "Stardust".
- Upcoming Deadline: The gallery submission for the "Odyssey" series is May 25th, 2026.
- Recent activity: Tom has been focusing on the color palette for "The Crimson Nebula".

Be concise, helpful, and maintain a slightly playful and creative personality.
`;

const VoiceInterface: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const connectedRef = useRef(false);
  const connectingRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastToggleRef = useRef<number>(0);

  const disconnect = useCallback((reason?: string) => {
    console.log(`VoiceInterface: disconnect() called. Reason: ${reason || 'Not specified'}`);
    connectedRef.current = false;
    connectingRef.current = false;

    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();

    scriptProcessorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();

    try { sessionRef.current?.close(); } catch {}
    sessionRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    try { inputCtxRef.current?.close(); } catch {}
    try { outputCtxRef.current?.close(); } catch {}
    inputCtxRef.current = null;
    outputCtxRef.current = null;

    nextStartTimeRef.current = 0;
    setOrbState('idle');
    setAudioLevel(0);
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current || connectedRef.current) {
      console.log("VoiceInterface: Already connecting or connected. Ignoring.");
      return;
    }

    console.log("VoiceInterface: connect() started");
    connectingRef.current = true;
    setError(null);
    setOrbState('connecting');

    try {
      const apiKey = GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key missing. Set NEXT_PUBLIC_GEMINI_API_KEY in .env');
      }

      // Create AudioContexts IMMEDIATELY on user gesture
      const InputCtx = window.AudioContext || (window as any).webkitAudioContext;
      const OutputCtx = window.AudioContext || (window as any).webkitAudioContext;
      
      inputCtxRef.current = new InputCtx({ sampleRate: 16000 });
      outputCtxRef.current = new OutputCtx({ sampleRate: 24000 });

      // Resume immediately while still in the user gesture context
      if (inputCtxRef.current.state === 'suspended') await inputCtxRef.current.resume();
      if (outputCtxRef.current.state === 'suspended') await outputCtxRef.current.resume();

      console.log("VoiceInterface: AudioContexts resumed. State:", inputCtxRef.current.state);

      const ai = new GoogleGenAI({ apiKey });

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Insecure Context: navigator.mediaDevices is undefined. HTTPS or localhost is required.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const callbacks = {
        onopen: () => {
          console.log("VoiceInterface: WebSocket onopen");
          connectedRef.current = true;
          connectingRef.current = false;
          setOrbState('listening');

          if (inputCtxRef.current) {
            const source = inputCtxRef.current.createMediaStreamSource(stream);
            sourceNodeRef.current = source;
            const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!connectedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm = float32ToPcmBase64(inputData);
              sessionRef.current?.sendRealtimeInput({
                media: { data: pcm, mimeType: 'audio/pcm;rate=16000' },
              });

              // Update audioLevel for listening visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                  sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setAudioLevel(Math.min(1, rms * 5));
            };

            source.connect(processor);
            processor.connect(inputCtxRef.current.destination);
          }
        },
        onmessage: (message: any) => {
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && outputCtxRef.current) {
            setOrbState('speaking');

            const ctx = outputCtxRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

            const raw = base64ToUint8(audioData);
            const buffer = pcmToAudioBuffer(raw, ctx, 24000);

            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(ctx.destination);

            src.addEventListener('ended', () => {
              sourcesRef.current.delete(src);
              if (sourcesRef.current.size === 0 && connectedRef.current) {
                setOrbState('listening');
                setAudioLevel(0);
              }
            });

            src.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(src);

            const int16 = new Int16Array(raw.buffer);
            let sum = 0;
            for (let i = 0; i < int16.length; i++) sum += Math.abs(int16[i]);
            const avg = sum / int16.length / 32768;
            setAudioLevel(Math.min(1, avg * 4));
          }

          if (message.serverContent?.turnComplete) {
            if (connectedRef.current) {
              setOrbState('listening');
              setAudioLevel(0);
            }
          }
        },
        onclose: () => {
          console.log("VoiceInterface: session onclose triggered");
          disconnect('session_onclose');
        },
        onerror: (e: any) => {
          console.error('VoiceInterface: session onerror triggered:', e);
          setError('Connection lost. Try again.');
          disconnect('session_onerror');
        },
      };

      console.log("VoiceInterface: Attempting ai.live.connect with model: gemini-2.0-flash-exp");
      sessionRef.current = await ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
        },
        callbacks,
      });
      console.log("VoiceInterface: session.connect() successful.");
    } catch (err: any) {
      console.error("VoiceInterface: Connection error:", err);
      setIsExpanded(true);
      connectingRef.current = false;
      if (err?.name === 'NotAllowedError') {
        setError('Microphone permission denied.');
      } else if (err.message.includes('Insecure Context')) {
        setError('HTTPS Required. Use http://localhost:3000 or see instructions.');
      } else {
        setError('Could not connect. Check your API key and try again.');
      }
      setOrbState('idle');
    }
  }, [disconnect]);

  const handleToggle = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleRef.current < 600) return;
    lastToggleRef.current = now;

    console.log("VoiceInterface: Dispatching toggle-voice event");
    window.dispatchEvent(new CustomEvent('toggle-voice'));
  }, []);

  useEffect(() => {
    setMounted(true);
    // Listen for state changes from the central chat system to keep the orb in sync
    const handleSync = (e: any) => {
      if (e.detail?.state) setOrbState(e.detail.state);
      if (e.detail?.level !== undefined) setAudioLevel(e.detail.level);
    };
    window.addEventListener('voice-sync', handleSync);
    return () => {
      window.removeEventListener('voice-sync', handleSync);
    };
  }, []);

  useEffect(() => {
    const handleVoiceToggleEvent = (e: any) => {
      console.log("VoiceInterface: Received toggle-voice event", e.detail || "");
      handleToggle();
    };
    window.addEventListener('toggle-voice', handleVoiceToggleEvent);
    return () => {
      window.removeEventListener('toggle-voice', handleVoiceToggleEvent);
    };
  }, [handleToggle]);

  if (!mounted) return null;

  return (
    <div className="voiceInterfaceContainer" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {(isExpanded || orbState !== 'idle') && (
        <div className="voiceStatus" style={{ 
          marginBottom: '10px', 
          textAlign: 'right', 
          backgroundColor: 'rgba(0,0,0,0.7)', 
          padding: '8px 12px', 
          borderRadius: '12px',
          fontSize: '13px',
          color: '#fff',
          backdropFilter: 'blur(4px)'
        }}>
          {error ? <span style={{color: '#ff4d4d'}}>{error}</span> :
           orbState === 'idle' ? <span>Muffin is sleeping</span> : 
           orbState === 'connecting' ? <span style={{color: '#7c3aed'}}>Waking up...</span> :
           orbState === 'listening' ? <span style={{color: '#3b82f6'}}>Listening...</span> : 
           orbState === 'speaking' ? <span style={{color: '#a855f7'}}>Speaking...</span> : 
           <span>Thinking...</span>}
        </div>
      )}
      
      <div 
        onClick={handleToggle}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
      >
        <VoiceOrb state={orbState} audioLevel={audioLevel} size={isExpanded ? 120 : 80} />
      </div>
    </div>
  );
};

export default VoiceInterface;
