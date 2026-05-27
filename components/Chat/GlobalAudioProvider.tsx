'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface GlobalAudioContextType {
  playingId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  play: (id: string, src: string) => void;
  pause: () => void;
  seek: (time: number) => void;
  setSpeed: (rate: number) => void;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;

      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const onDurationChange = () => {
        setDuration(audio.duration || 0);
      };

      const onEnded = () => {
        setIsPlaying(false);
        setPlayingId(null);
        setCurrentTime(0);
      };

      const onPause = () => {
        setIsPlaying(false);
      };

      const onPlay = () => {
        setIsPlaying(true);
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('durationchange', onDurationChange);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('play', onPlay);

      return () => {
        audio.pause();
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('durationchange', onDurationChange);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('play', onPlay);
      };
    }
  }, []);

  // Handle playback rate updates
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const play = (id: string, src: string) => {
    if (!audioRef.current) return;

    if (playingId === id) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Failed to resume audio:', err);
        });
      }
    } else {
      // Load and play a new track
      audioRef.current.pause();
      
      // Determine if source is base64 or url
      let finalSrc = src;
      if (src.startsWith('data:audio') || src.includes(';base64,')) {
        finalSrc = src;
      } else if (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
        // Fallback: if it's base64 but raw, add the prefix
        finalSrc = `data:audio/webm;base64,${src}`;
      }

      audioRef.current.src = finalSrc;
      audioRef.current.playbackRate = playbackRate;
      setPlayingId(id);
      
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Failed to play new audio source:', err);
          setIsPlaying(false);
          setPlayingId(null);
        });
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      const boundedTime = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = boundedTime;
      setCurrentTime(boundedTime);
    }
  };

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
  };

  return (
    <GlobalAudioContext.Provider
      value={{
        playingId,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        play,
        pause,
        seek,
        setSpeed,
      }}
    >
      {children}
    </GlobalAudioContext.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
}
