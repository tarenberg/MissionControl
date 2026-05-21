'use client';

import React from 'react';

interface TelemetryIndicatorProps {
  isThinking: boolean;
  agentName: string;
}

export default function TelemetryIndicator({ isThinking, agentName }: TelemetryIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800/40 shadow-soft transition-all duration-300">
      {/* Glow Radar Ring */}
      <div className="relative flex items-center justify-center w-6 h-6">
        {isThinking ? (
          <>
            {/* Pulsing Outer Glow */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20 animate-ping" />
            {/* Spinning Gradient Border */}
            <div className="w-5 h-5 rounded-full border-2 border-transparent border-t-indigo-500 border-r-violet-400 animate-spin" />
            {/* Solid Center Dot */}
            <span className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-glow" />
          </>
        ) : (
          <>
            {/* Steady Online Indicator */}
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-green" />
          </>
        )}
      </div>

      {/* Info labels */}
      <div className="flex flex-col text-left">
        <span className="text-xs font-semibold text-zinc-200 leading-tight">
          {agentName}
        </span>
        <span className="text-[10px] text-zinc-500 leading-none">
          {isThinking ? 'thinking...' : 'online & ready'}
        </span>
      </div>
    </div>
  );
}
