'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function joinSegments(segments: string[]): string {
  if (segments.length === 0) return '';
  return segments.map((s) => s.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

interface VATOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: (blob: Blob, transcript?: string) => void;
  onTranscript?: (text: string) => void;
  onPreviewAudio?: (blob: Blob) => Promise<void> | void;
  forcePreviewFallback?: boolean;
  previewIntervalMs?: number;
  disabled?: boolean;
}

export function useVAT(options: VATOptions = {}) {
  const {
    onSpeechStart,
    onSpeechEnd,
    onTranscript,
    onPreviewAudio,
    forcePreviewFallback = false,
    previewIntervalMs = 1400,
    disabled = false,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [db, setDb] = useState(-90);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewChunksRef = useRef<Blob[]>([]);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewInFlightRef = useRef(false);
  const transcriptRef = useRef('');
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onTranscriptRef = useRef(onTranscript);
  const onPreviewAudioRef = useRef(onPreviewAudio);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onPreviewAudioRef.current = onPreviewAudio; }, [onPreviewAudio]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const stopPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    previewInFlightRef.current = false;
  }, []);

  const stopAnalyzer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
    setDb(-90);
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback((discard = false) => {
    stopPreviewTimer();
    stopRecognition();
    stopAnalyzer();

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      // Flip UI state off immediately so the mic can always be turned off,
      // even if the browser delays/loses the onstop callback.
      setIsSpeaking(false);
      setIsActive(false);

      let finalized = false;
      const finalize = async () => {
        if (finalized) return;
        finalized = true;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const finalTranscript = transcriptRef.current;
        chunksRef.current = [];
        previewChunksRef.current = [];
        stopStream();
        if (!discard && blob.size > 0) {
          await onSpeechEndRef.current?.(blob, finalTranscript);
        }
        setTranscript('');
      };
      recorder.onstop = () => {
        void finalize();
      };
      try {
        recorder.requestData();
      } catch {}
      recorder.stop();
      // Fallback: some mobile/browser contexts can miss onstop.
      setTimeout(() => {
        void finalize();
      }, 1200);
    } else {
      setIsSpeaking(false);
      setIsActive(false);
      chunksRef.current = [];
      previewChunksRef.current = [];
      stopStream();
      setTranscript('');
    }
  }, [stopPreviewTimer, stopRecognition, stopStream]);

  const startRecording = useCallback(async () => {
    try {
      const getUserMedia = navigator?.mediaDevices?.getUserMedia;
      if (!getUserMedia) {
        throw new Error('Microphone API unavailable in this context.');
      }

      const stream = await getUserMedia.call(navigator.mediaDevices, { audio: true });
      streamRef.current = stream;

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          if (analyserRef.current && stream.active) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalizedLevel = average / 255;
            setLevel(normalizedLevel);

            // Convert to dB (-90 to 0)
            const calculatedDb = average > 0 ? 20 * Math.log10(average / 255) : -90;
            setDb(calculatedDb);

            animationFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      } catch (analyserErr) {
        console.warn('Live audio analyzer failed to start:', analyserErr);
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      previewChunksRef.current = [];
      setTranscript('');
      transcriptRef.current = '';
      setError(null);

      recorder.ondataavailable = (e) => {
        if (e.data.size <= 0) return;
        chunksRef.current.push(e.data);
        previewChunksRef.current.push(e.data);
        if (previewChunksRef.current.length > 40) {
          previewChunksRef.current = previewChunksRef.current.slice(-40);
        }
      };

      recorder.start(250);
      setIsActive(true);
      setIsSpeaking(true);
      onSpeechStart?.();

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechRecognitionAvailable(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          const segments: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            segments.push(event.results[i][0].transcript);
          }
          const text = joinSegments(segments);
          setTranscript(text);
          onTranscriptRef.current?.(text);
        };
        recognition.onerror = () => {
          setSpeechRecognitionAvailable(false);
        };
        recognitionRef.current = recognition;
        recognition.start();
      } else {
        setSpeechRecognitionAvailable(false);
      }

      if (onPreviewAudioRef.current && (forcePreviewFallback || !SpeechRecognition)) {
        previewTimerRef.current = setInterval(() => {
          if (previewInFlightRef.current) return;
          if (chunksRef.current.length === 0) return;
          previewInFlightRef.current = true;
          // Use the complete chunks accumulated so far from the beginning of recording.
          // This ensures the WebM/Ogg container header (always at index 0) is included,
          // which is required for PyAV/FFmpeg to decode the file on the backend without throwing an InvalidDataError.
          const previewBlob = new Blob(chunksRef.current, { type: mimeType });
          Promise.resolve(onPreviewAudioRef.current?.(previewBlob))
            .catch(() => {})
            .finally(() => {
              previewInFlightRef.current = false;
            });
        }, previewIntervalMs);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start voice capture');
      setIsActive(false);
      setIsSpeaking(false);
      stopStream();
    }
  }, [forcePreviewFallback, onSpeechStart, previewIntervalMs, stopStream]);

  const toggle = useCallback(async (discardCurrent?: boolean) => {
    if (isActive) {
      stopRecording(!!discardCurrent);
    } else {
      await startRecording();
    }
  }, [isActive, startRecording, stopRecording]);

  useEffect(() => {
    if (disabled && isActive) {
      stopRecording(true);
    }
  }, [disabled, isActive, stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording(true);
    };
  }, [stopRecording]);

  return {
    isActive,
    isSpeaking,
    transcript,
    speechRecognitionAvailable,
    error,
    toggle,
    level,
    db,
    threshold: 0,
    startRecording,
    stopRecording,
  };
}
