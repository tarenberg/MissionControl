"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

// --- Helpers ---
function float32ToPcmBase64(data: Float32Array): string {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
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
  for (let i = 0; i < int16.length; i++) channelData[i] = int16[i] / 32768.0;
  return buffer;
}

const systemInstruction = `You are Muffin, Tom's studio assistant. Be concise.
Available Actions:
- [[ACTION: {"type": "NAVIGATE", "path": "/target"}]]
- [[ACTION: {"type": "CHECK_STUDIO"}]]
`;

export type GeminiLiveState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface GeminiLiveOptions {
  apiKey: string;
  onMessage?: (role: 'user' | 'assistant', content: string) => void;
  onAction?: (action: any) => void;
  onStateChange?: (state: GeminiLiveState) => void;
  onLevelChange?: (level: number) => void;
}

export function useGeminiLiveV7(options: GeminiLiveOptions) {
  const [state, setState] = useState<GeminiLiveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const connectedRef = useRef(false);
  const setupCompleteRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const userSpeakingRef = useRef(false);
  const silenceTimeoutRef = useRef<any>(null);
  const connectingTimeoutRef = useRef<any>(null);

  const shouldBeConnectedRef = useRef(false);
  const reconnectTimeoutRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const connectRef = useRef<any>(null);

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const setInternalState = (s: GeminiLiveState) => {
    setState(s);
    optionsRef.current.onStateChange?.(s);
    if (typeof window !== 'undefined') {
      (window as any).isGeminiLiveConnected = (s !== 'idle');
    }

    // Fail-safe for 'connecting' (thinking) state to prevent getting stuck
    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }

    if (s === 'connecting') {
      connectingTimeoutRef.current = setTimeout(() => {
        console.warn('GeminiLiveV7: Fail-safe triggered. Resetting connecting state to listening.');
        setInternalState('listening');
      }, 5000); // 5 seconds max processing wait
    }
  };

  const disconnect = useCallback((reason?: string) => {
    console.log(`GeminiLiveV7: Disconnect (${reason})`);
    
    // If we are closing cleanly, reset reconnection state
    if (reason === 'user_toggle' || reason === 'unmount' || reason === 'init_error') {
      shouldBeConnectedRef.current = false;
      retryCountRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    connectedRef.current = false;
    setupCompleteRef.current = false;
    userSpeakingRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (connectingTimeoutRef.current) {
      clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }

    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();

    processorRef.current?.disconnect();
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
    setInternalState('idle');
    optionsRef.current.onLevelChange?.(0);
  }, []); // Remove options dependency

  const connect = useCallback(async () => {
    if (connectedRef.current) return;

    shouldBeConnectedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setInternalState('connecting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const InputCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputCtxRef.current = new InputCtx({ sampleRate: 16000 });
      outputCtxRef.current = new InputCtx({ sampleRate: 24000 });

      const source = inputCtxRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!connectedRef.current || !sessionRef.current || !setupCompleteRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate RMS level for UI and silence detection
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        const level = Math.min(1, rms * 10); // Boost level representation for UI
        optionsRef.current.onLevelChange?.(level);

        // ALWAYS transmit audio data to Gemini once connected so it hears all whispers
        try {
          sessionRef.current.sendRealtimeInput({
            media: { data: float32ToPcmBase64(inputData), mimeType: `audio/pcm;rate=16000` },
          });
        } catch (err) {
          console.warn('GeminiLiveV7: Failed to transmit audio block:', err);
        }

        // Active speech tracking for client-side Orb UI and silence detection
        if (rms > 0.002) { // 0.002 is a safe and highly responsive speech threshold
          if (!userSpeakingRef.current) {
            userSpeakingRef.current = true;
            console.log('GeminiLiveV7: User started speaking 🎙️');
            setInternalState('listening'); // Force Orb to green listening state
          }

          // Clear silence timer as long as user is actively talking
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        } else {
          // If the user was speaking and now fell below threshold, initiate silence timer
          if (userSpeakingRef.current && !silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (userSpeakingRef.current) {
                userSpeakingRef.current = false;
                console.log('GeminiLiveV7: User stopped speaking (silence detected). Transitioning to connecting/thinking state.');
                setInternalState('connecting'); // Shows "Processing..." on screen
              }
              silenceTimeoutRef.current = null;
            }, 1000); // 1.0s of continuous silence triggers the thinking state
          }
        }
      };

      source.connect(processor);
      processor.connect(inputCtxRef.current.destination);

      console.log('GeminiLiveV7: CONNECTING... BUNDLE_SYNC: 15:50', { 
        keyPresent: !!optionsRef.current.apiKey,
        keyLen: optionsRef.current.apiKey?.length,
        model: 'models/gemini-2.5-flash-native-audio-latest'
      });

      if (!optionsRef.current.apiKey) {
        throw new Error('SDK says Key not set. Please check NEXT_PUBLIC_GEMINI_API_KEY.');
      }

      const genAI = new GoogleGenAI({ apiKey: optionsRef.current.apiKey, apiVersion: 'v1alpha' });
      
      const callbacks = {
        onopen: () => {
          console.log('GeminiLiveV7: WebSocket Opened ✅');
          connectedRef.current = true;
        },
        onmessage: (msg: any) => {
          console.log('GeminiLiveV7: Received Msg:', JSON.stringify(msg));
          if (msg.setupComplete) {
            console.log('GeminiLiveV7: Setup Complete 🚀');
            setupCompleteRef.current = true;
            retryCountRef.current = 0; // Reset retry count upon successful connection and setup!
            setInternalState('listening');
          }
          if (msg.error) {
            console.error('GeminiLiveV7: Msg Error:', msg.error);
            setError(msg.error.message);
            disconnect('model_error');
          }
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setInternalState('listening'); // Instantly go back to listening if interrupted
          }
          if (msg.serverContent?.turnComplete) {
            console.log('GeminiLiveV7: Turn Complete ✅');
            if (sourcesRef.current.size === 0) {
              setInternalState('listening');
            }
          }
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && outputCtxRef.current) {
            setInternalState('speaking');
            const buffer = pcmToAudioBuffer(base64ToUint8(audioData), outputCtxRef.current, 24000);
            const src = outputCtxRef.current.createBufferSource();
            src.buffer = buffer;
            src.connect(outputCtxRef.current.destination);
            src.onended = () => {
              sourcesRef.current.delete(src);
              if (sourcesRef.current.size === 0) setInternalState('listening');
            };
            src.start(Math.max(nextStartTimeRef.current, outputCtxRef.current.currentTime));
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtxRef.current.currentTime) + buffer.duration;
            sourcesRef.current.add(src);
          }
          const modelText = msg.serverContent?.modelTurn?.parts?.[0]?.text;
          if (modelText) {
            console.log('GeminiLiveV7: Assistant Text Received:', modelText);
            optionsRef.current.onMessage?.('assistant', modelText);
            
            let action = null;
            const actionMatch = modelText.match(/\[\[ACTION:\s*({.*?})\]\]/);
            if (actionMatch) {
              try {
                action = JSON.parse(actionMatch[1]);
              } catch {}
            }

            // Client-side Resilient Fallback Parser for Gemini Live
            if (!action) {
              const lowerContent = modelText.toLowerCase();
              if (lowerContent.includes('navigate') || lowerContent.includes('go to') || lowerContent.includes('open') || lowerContent.includes('show')) {
                if (lowerContent.includes('project')) {
                  action = { type: 'NAVIGATE', path: '/projects' };
                } else if (lowerContent.includes('art') || lowerContent.includes('tracker')) {
                  action = { type: 'NAVIGATE', path: '/art-tracker' };
                } else if (lowerContent.includes('task') || lowerContent.includes('todo') || lowerContent.includes('to-do')) {
                  action = { type: 'NAVIGATE', path: '/tasks' };
                } else if (lowerContent.includes('calendar')) {
                  action = { type: 'NAVIGATE', path: '/calendar' };
                } else if (lowerContent.includes('memory') || lowerContent.includes('palace')) {
                  action = { type: 'NAVIGATE', path: '/memory' };
                } else if (lowerContent.includes('ops') || lowerContent.includes('system') || lowerContent.includes('control')) {
                  action = { type: 'NAVIGATE', path: '/ops' };
                }
              }
            }

            if (action) {
              try {
                optionsRef.current.onAction?.(action);
              } catch (e) {
                console.error('GeminiLiveV7 action execution failed:', e);
              }
            }
          }
        },
        onclose: (e: any) => {
          console.log('GeminiLiveV7: WS Close:', e.code, e.reason);
          if (e.code !== 1000 && e.code !== 1005) setError(`Closed (${e.code}): ${e.reason}`);
          disconnect('ws_close');

          // Resilient auto-reconnect backoff if unexpectedly closed
          if (shouldBeConnectedRef.current && retryCountRef.current < 5) {
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff up to 10s
            retryCountRef.current += 1;
            console.log(`GeminiLiveV7: Unexpected close (code ${e.code}). Reconnecting in ${delay}ms... (Attempt ${retryCountRef.current}/5)`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connectRef.current?.();
            }, delay);
          }
        },
        onerror: (e: any) => {
          console.error('GeminiLiveV7: WS Error:', e);
          setError('WebSocket error');
          disconnect('ws_error');
        }
      };

      console.log('GeminiLiveV7: Calling genAI.live.connect...');
      sessionRef.current = await genAI.live.connect({
        model: 'models/gemini-2.5-flash-native-audio-latest',
        config: { 
          responseModalities: ['audio' as Modality], 
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            candidateCount: 1,
            temperature: 0.7,
          }
        },
        callbacks
      });
      console.log('GeminiLiveV7: sessionRef created');
    } catch (err: any) {
      console.error('GeminiLiveV7: Init Error:', err);
      setError(err.message);
      disconnect('init_error');
    }
  }, [disconnect]); // Remove options dependency

  const toggle = useCallback(() => {
    if (connectedRef.current) disconnect('user_toggle');
    else connect();
  }, [connect, disconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => () => {
    shouldBeConnectedRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    disconnect('unmount');
  }, [disconnect]);

  return { state, error, toggle, connected: connectedRef.current };
}
