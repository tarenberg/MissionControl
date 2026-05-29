import React, { useMemo } from 'react';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface Props {
  state: OrbState;
  audioLevel?: number; // 0-1
  size?: number;
  isGlobalPlaying?: boolean;
}

const PARTICLE_COUNT = 12;

const VoiceOrb: React.FC<Props> = ({ state, audioLevel = 0, size = 200, isGlobalPlaying = false }) => {
  const scale = state === 'speaking' ? 1 + audioLevel * 0.2 : 1;
  const SIZE = size;

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 20,
        dist: (SIZE / 2) + 5 + Math.random() * 15,
        size: 2 + Math.random() * 2,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4,
      })),
    [SIZE],
  );

  const waveSegments = useMemo(() => Array.from({ length: 24 }, (_, i) => i * 15), []);

  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: SIZE + 40, height: SIZE + 40 }}
    >
      {/* Waveform ring */}
      {state === 'speaking' && (
        <div 
          className="absolute z-3 pointer-events-none"
          style={{ width: SIZE, height: SIZE }}
        >
          {waveSegments.map((deg, i) => {
            const h = 4 + audioLevel * 20 * (0.5 + 0.5 * Math.sin(i * 0.8 + audioLevel * 6));
            return (
              <div
                key={i}
                className="absolute w-[3px] rounded-full transition-all duration-75 origin-center"
                style={{
                  height: h,
                  background: isGlobalPlaying
                    ? `rgba(0, 206, 201, ${0.5 + audioLevel * 0.5})`
                    : `rgba(162, 155, 254, ${0.4 + audioLevel * 0.5})`,
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${deg}deg) translate(0, -${SIZE / 2 + 5 + audioLevel * 5}px)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Global Playback Radar Rings */}
      {isGlobalPlaying && (
        <>
          <div 
            className="absolute rounded-full border border-[#00cec9]/20 animate-[ping_2s_infinite] pointer-events-none" 
            style={{ width: SIZE + 15, height: SIZE + 15 }}
          />
          <div 
            className="absolute rounded-full border border-[#a29bfe]/10 animate-[ping_3.5s_infinite] pointer-events-none" 
            style={{ width: SIZE + 30, height: SIZE + 30 }}
          />
        </>
      )}

      {/* Rings */}
      {state === 'listening' && (
        <>
          <div 
            className="absolute rounded-full border-2 border-[#a29bfe]/30 animate-[ping_3s_infinite]" 
            style={{ width: SIZE + 10, height: SIZE + 10 }}
          />
        </>
      )}

      {/* Particles */}
      {state === 'speaking' &&
        particles.map((p, i) => {
          const rad = ((p.angle + audioLevel * 30) * Math.PI) / 180;
          const x = Math.cos(rad) * (p.dist + audioLevel * 10);
          const y = Math.sin(rad) * (p.dist + audioLevel * 10);
          return (
            <div
              key={i}
              className="absolute rounded-full shadow-lg transition-all duration-150 animate-pulse"
              style={{
                width: p.size,
                height: p.size,
                background: isGlobalPlaying
                  ? `rgba(0, 206, 201, ${p.opacity * (0.6 + audioLevel * 0.4)})`
                  : `rgba(162, 155, 254, ${p.opacity * (0.5 + audioLevel * 0.5)})`,
                left: (SIZE + 40) / 2 + x - (p.size / 2),
                top: (SIZE + 40) / 2 + y - (p.size / 2),
              }}
            />
          );
        })}

      {/* Main Orb */}
      <div
        className={`rounded-full transition-all duration-500 relative z-2 overflow-hidden shadow-[10px_10px_20px_#121416,-10px_-10px_20px_#2a2e33] ${
          state === 'idle' ? 'bg-gradient-to-br from-[#2d3436] to-[#1e2124] animate-pulse' :
          state === 'connecting' ? 'bg-gradient-to-r from-[#6c5ce7] via-[#a29bfe] to-[#6c5ce7] animate-spin' :
          state === 'listening' ? 'bg-gradient-to-br from-[#0984e3] to-[#00cec9]' :
          isGlobalPlaying ? 'bg-gradient-to-br from-[#00cec9] via-[#a29bfe] to-[#6c5ce7] animate-pulse' :
          'bg-gradient-to-br from-[#6c5ce7] via-[#a29bfe] to-[#4834d4]'
        }`}
        style={{ 
          width: SIZE, 
          height: SIZE,
          transform: `scale(${scale})` 
        }}
      >
        {(state === 'listening' || state === 'speaking') && (
          <div className="absolute inset-[-20px] rounded-full bg-[conic-gradient(from_0deg,transparent_0%,rgba(255,255,255,0.05)_25%,transparent_50%,rgba(255,255,255,0.03)_75%,transparent_100%)] animate-[spin_6s_linear_infinite]" />
        )}
      </div>
    </div>
  );
};

export default VoiceOrb;
