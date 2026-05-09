import React, { useMemo } from 'react';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface Props {
  state: OrbState;
  audioLevel?: number; // 0-1
  size?: number;
}

const PARTICLE_COUNT = 18;

const VoiceOrb: React.FC<Props> = ({ state, audioLevel = 0, size = 180 }) => {
  const SIZE = size;
  const scale = state === 'speaking' ? 1 + audioLevel * 0.3 : 1;

  // Generate stable particle positions
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 20,
        dist: SIZE * 0.55 + Math.random() * 20,
        size: 2 + Math.random() * 3,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    [SIZE],
  );

  // Waveform ring segments
  const waveSegments = useMemo(() => Array.from({ length: 36 }, (_, i) => i * 10), []);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'relative',
      width: SIZE + 60,
      height: SIZE + 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    waveRing: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      left: 30,
      top: 30,
      zIndex: 3,
      pointerEvents: 'none',
    },
    orb: {
      width: SIZE,
      height: SIZE,
      borderRadius: '50%',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      zIndex: 2,
      overflow: 'hidden',
    },
    shimmer: {
      position: 'absolute',
      inset: -20,
      borderRadius: '50%',
      background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.06) 25%, transparent 50%, rgba(255,255,255,0.04) 75%, transparent 100%)',
      animation: 'shimmerRotate 6s linear infinite',
    },
    orbIdle: {
      background: 'radial-gradient(circle at 40% 40%, #3a3a4a, #1a1a2e)',
      boxShadow: '0 0 40px rgba(100, 100, 140, 0.2)',
      animation: 'slowPulse 4s ease-in-out infinite',
    },
    orbConnecting: {
      background: 'conic-gradient(from 0deg, #667eea, #764ba2, #667eea)',
      boxShadow: '0 0 60px rgba(102, 126, 234, 0.4)',
      animation: 'spin 2s linear infinite',
    },
    orbListening: {
      background: 'radial-gradient(circle at 40% 40%, #60a5fa, #1e40af)',
      boxShadow: '0 0 80px rgba(59, 130, 246, 0.5), 0 0 120px rgba(59, 130, 246, 0.2)',
      animation: 'breathe 3s ease-in-out infinite',
    },
    orbSpeaking: {
      background: 'radial-gradient(circle at 40% 40%, #c084fc, #7c3aed, #4c1d95)',
      boxShadow: '0 0 80px rgba(139, 92, 246, 0.6), 0 0 140px rgba(139, 92, 246, 0.3), 0 0 200px rgba(139, 92, 246, 0.15)',
    },
    ring: {
      position: 'absolute',
      top: 30,
      left: 30,
      width: SIZE,
      height: SIZE,
      borderRadius: '50%',
      zIndex: 1,
    },
    ringListening1: {
      border: '2px solid rgba(59, 130, 246, 0.3)',
      animation: 'ringPulse1 3s ease-in-out infinite',
    },
    ringListening2: {
      border: '1px solid rgba(59, 130, 246, 0.15)',
      animation: 'ringPulse2 3s ease-in-out infinite 0.5s',
    },
    ringListening3: {
      border: '1px solid rgba(59, 130, 246, 0.08)',
      animation: 'ringPulse3 4s ease-in-out infinite 1s',
    },
    ringSpeaking1: {
      border: '2px solid rgba(139, 92, 246, 0.4)',
      animation: 'ripple 1.5s ease-out infinite',
    },
    ringSpeaking2: {
      border: '2px solid rgba(139, 92, 246, 0.3)',
      animation: 'rippleSlow 2s ease-out infinite 0.3s',
    },
    ringSpeaking3: {
      border: '1px solid rgba(168, 85, 247, 0.2)',
      animation: 'rippleFast 2.5s ease-out infinite 0.6s',
    },
    ringSpeaking4: {
      border: '1px solid rgba(168, 85, 247, 0.12)',
      animation: 'rippleOuter 3s ease-out infinite 0.9s',
    },
    ringConnecting: {
      border: '2px dashed rgba(102, 126, 234, 0.4)',
      animation: 'spin 3s linear infinite reverse',
    },
  };

  return (
    <div style={styles.container}>
      {/* Waveform ring — visible when speaking */}
      {state === 'speaking' && (
        <div style={styles.waveRing}>
          {waveSegments.map((deg, i) => {
            const h = 6 + audioLevel * 28 * (0.5 + 0.5 * Math.sin(i * 0.8 + audioLevel * 6));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  background: `rgba(192, 132, 252, ${0.4 + audioLevel * 0.5})`,
                  left: '50%',
                  top: '50%',
                  transformOrigin: '50% 50%',
                  transform: `rotate(${deg}deg) translate(0, -${SIZE / 2 + 14 + audioLevel * 6}px)`,
                  transition: 'height 0.08s ease-out',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Concentric pulse rings */}
      {state === 'listening' && (
        <>
          <div style={{ ...styles.ring, ...styles.ringListening1 }} />
          <div style={{ ...styles.ring, ...styles.ringListening2 }} />
          <div style={{ ...styles.ring, ...styles.ringListening3 }} />
        </>
      )}
      {state === 'speaking' && (
        <>
          <div style={{ ...styles.ring, ...styles.ringSpeaking1, transform: `scale(${1 + audioLevel * 0.5})` }} />
          <div style={{ ...styles.ring, ...styles.ringSpeaking2, transform: `scale(${1 + audioLevel * 0.3})` }} />
          <div style={{ ...styles.ring, ...styles.ringSpeaking3, transform: `scale(${1 + audioLevel * 0.7})` }} />
          <div style={{ ...styles.ring, ...styles.ringSpeaking4, transform: `scale(${1 + audioLevel * 0.9})` }} />
        </>
      )}
      {state === 'connecting' && (
        <div style={{ ...styles.ring, ...styles.ringConnecting }} />
      )}

      {/* Particles — float around when speaking */}
      {state === 'speaking' &&
        particles.map((p, i) => {
          const rad = ((p.angle + audioLevel * 30) * Math.PI) / 180;
          const x = Math.cos(rad) * (p.dist + audioLevel * 20);
          const y = Math.sin(rad) * (p.dist + audioLevel * 20);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: `rgba(192, 132, 252, ${p.opacity * (0.5 + audioLevel * 0.5)})`,
                boxShadow: `0 0 ${p.size * 2}px rgba(192,132,252,0.4)`,
                left: (SIZE + 60) / 2 + x,
                top: (SIZE + 60) / 2 + y,
                transition: 'all 0.15s ease-out',
                animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
                zIndex: 3,
              }}
            />
          );
        })}

      {/* Main orb */}
      <div
        style={{
          ...styles.orb,
          ...(state === 'idle' ? styles.orbIdle : {}),
          ...(state === 'connecting' ? styles.orbConnecting : {}),
          ...(state === 'listening' ? styles.orbListening : {}),
          ...(state === 'speaking' ? styles.orbSpeaking : {}),
          transform: `scale(${scale})`,
        }}
      >
        {/* Inner shimmer overlay */}
        {(state === 'listening' || state === 'speaking') && (
          <div style={styles.shimmer} />
        )}
      </div>
    </div>
  );
};

export default VoiceOrb;
