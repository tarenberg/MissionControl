'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGlobalAudio } from './GlobalAudioProvider';

interface AudioWaveformProps {
  messageId: string;
  audioSrc: string;
}

// Global memory cache for decoded waveforms to prevent CPU re-computation
const waveformCache = new Map<string, number[]>();

export function AudioWaveform({ messageId, audioSrc }: AudioWaveformProps) {
  const { playingId, isPlaying, currentTime, duration, playbackRate, play, seek, setSpeed } = useGlobalAudio();
  const [waveform, setWaveform] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);

  const isActive = playingId === messageId;
  const currentProgress = isActive && duration > 0 ? currentTime / duration : 0;

  // Generate waveform structure
  useEffect(() => {
    let active = true;

    async function decodeAudio() {
      if (!audioSrc) return;

      // Check cache first
      if (waveformCache.has(audioSrc)) {
        setWaveform(waveformCache.get(audioSrc)!);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let finalSrc = audioSrc;
        
        // Ensure proper schema prefix if it's raw base64
        if (!audioSrc.startsWith('http') && !audioSrc.startsWith('/') && !audioSrc.startsWith('data:')) {
          finalSrc = `data:audio/webm;base64,${audioSrc}`;
        }

        const response = await fetch(finalSrc);
        const arrayBuffer = await response.arrayBuffer();

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        const numBars = 40;
        const blockSize = Math.floor(channelData.length / numBars);
        const amplitudes: number[] = [];

        for (let i = 0; i < numBars; i++) {
          let blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j] || 0);
          }
          amplitudes.push(sum / (blockSize || 1));
        }

        // Normalize heights between 0.15 and 1.0 for styling consistency
        const maxVal = Math.max(...amplitudes);
        const normalized = amplitudes.map(v => 
          Math.max(0.15, maxVal > 0 ? (v / maxVal) : 0.15)
        );

        if (active) {
          waveformCache.set(audioSrc, normalized);
          setWaveform(normalized);
          setLoading(false);
        }
      } catch (err) {
        console.error('AudioWaveform decoding failed, generating simulation:', err);
        // Fallback simulation in case of codec/cors issues
        const simulated = Array.from({ length: 40 }, () => 
          Math.max(0.15, Math.sin(Math.random() * Math.PI) * 0.85 + 0.15)
        );
        if (active) {
          waveformCache.set(audioSrc, simulated);
          setWaveform(simulated);
          setLoading(false);
        }
      }
    }

    decodeAudio();

    return () => {
      active = false;
    };
  }, [audioSrc]);

  // Unified scrubbing handler
  const handleScrub = (clientX: number) => {
    if (!svgRef.current || loading || duration <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const percent = (clientX - rect.left) / rect.width;
    const boundedPercent = Math.max(0, Math.min(1, percent));
    seek(boundedPercent * duration);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (loading) return;
    isDraggingRef.current = true;
    handleScrub(e.clientX);

    // Bind global listeners to allow smooth dragging outside of the waveform bounds
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        handleScrub(moveEvent.clientX);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handlePlayToggle = () => {
    play(messageId, audioSrc);
  };

  // Convert duration into standard timeline stamp MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-full max-w-[280px] p-2 rounded-xl bg-neutral-100/10 dark:bg-neutral-800/20 shadow-inner border border-neutral-200/20">
      {/* Play/Pause Trigger */}
      <button
        onClick={handlePlayToggle}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-lg text-white transition-all transform active:scale-95 shrink-0"
      >
        {isActive && isPlaying ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
        )}
      </button>

      {/* Playback Speed Controller Badge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (playbackRate === 1) setSpeed(1.5);
          else if (playbackRate === 1.5) setSpeed(2);
          else setSpeed(1);
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono bg-neutral-200/50 dark:bg-neutral-800/60 hover:bg-neutral-300 dark:hover:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 shadow-sm border border-neutral-300/20 dark:border-neutral-700/30 transition-all shrink-0 active:scale-95"
        title="Cycle playback speed (1.0x -> 1.5x -> 2.0x)"
      >
        {playbackRate}x
      </button>

      {/* SVG Interactive Waveform & Timer */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <svg
          ref={svgRef}
          onMouseDown={handleMouseDown}
          className={`h-8 w-full cursor-col-resize select-none overflow-visible ${loading ? 'opacity-40 animate-pulse' : ''}`}
          viewBox="0 0 160 30"
          style={{ touchAction: 'none' }}
        >
          {loading ? (
            // Loading placeholder bar representation
            Array.from({ length: 40 }).map((_, i) => (
              <rect
                key={i}
                x={i * 4}
                y={10}
                width={2.5}
                height={10}
                rx={1.2}
                className="fill-neutral-300 dark:fill-neutral-700"
              />
            ))
          ) : (
            waveform.map((height, i) => {
              const barProgress = i / waveform.length;
              const isPlayed = barProgress < currentProgress;
              const barHeight = height * 26;
              return (
                <rect
                  key={i}
                  x={i * 4}
                  y={30 - barHeight}
                  width={2.5}
                  height={barHeight}
                  rx={1.25}
                  className={`transition-colors duration-150 ${
                    isPlayed 
                      ? 'fill-indigo-500 dark:fill-indigo-400' 
                      : 'fill-neutral-300 dark:fill-neutral-600 hover:fill-neutral-400'
                  }`}
                />
              );
            })
          )}
        </svg>

        {/* Playback Timer Stamp */}
        <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
          <span>{isActive ? formatTime(currentTime) : '0:00'}</span>
          <span>{isActive ? formatTime(duration) : '0:00'}</span>
        </div>
      </div>
    </div>
  );
}
