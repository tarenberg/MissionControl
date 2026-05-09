import React, { useState, useRef, useEffect, useCallback } from 'react';
import VoiceOrb, { OrbState } from './VoiceOrb';
import styles from './ArtTrackerDashboard.module.css';
import { GoogleGenAI, Modality } from '@google/genai';

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
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const connectedRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const disconnect = useCallback(() => {
    connectedRef.current = false;

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
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError('API key missing. Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local');
      return;
    }

    try {
      setError(null);
      setOrbState('connecting');

      const ai = new GoogleGenAI({ apiKey });

      inputCtxRef.current = new AudioContext({ sampleRate: 16000 });
      outputCtxRef.current = new AudioContext({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const callbacks = {
        onopen: () => {
          connectedRef.current = true;
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
          disconnect();
        },
        onerror: (e: any) => {
          console.error('Session error', e);
          setError('Connection lost. Try again.');
          disconnect();
        },
      };

      sessionRef.current = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
        },
        callbacks,
      });
    } catch (err: any) {
      console.error(err);
      if (err?.name === 'NotAllowedError') {
        setError('Microphone permission denied.');
      } else {
        setError('Could not connect. Check your API key and try again.');
      }
      setOrbState('idle');
    }
  }, [disconnect, systemInstruction]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);


  // For now, this is a UI-only stub to verify the glow and orb
  const handleToggle = () => {
    if (orbState === 'idle') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className={styles.voiceInterfaceContainer}>
      {isExpanded && (
        <div className={styles.voiceStatus}>
          {error ? <span style={{color: 'red'}}>{error}</span> :
           orbState === 'idle' ? 'Muffin is sleeping' : 
           orbState === 'connecting' ? 'Waking up...' :
           orbState === 'listening' ? 'Listening to you...' : 'Muffin is thinking...'}
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
