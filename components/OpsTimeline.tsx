'use client';

import React, { useState } from 'react';
import type { TimelineEntry } from '@/lib/opsControlData';

// Serialized version: Date fields become strings at the server→client boundary
type SerializedEntry = Omit<TimelineEntry, 'scheduledAt'> & { scheduledAt: string };

interface Props {
  entries: SerializedEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TYPE_META: Record<TimelineEntry['type'], { label: string; icon: string; color: string; ring: string }> = {
  cron:      { label: 'Cron',      icon: '⏰', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/20' },
  heartbeat: { label: 'Pulse',     icon: '💓', color: 'text-green-600 dark:text-green-400', ring: 'ring-green-500/20' },
  internal:  { label: 'System',    icon: '⚙️',  color: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20' },
  manual:    { label: 'Manual',    icon: '🖐️',  color: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500/20' },
  external:  { label: 'External',  icon: '🌐',  color: 'text-gray-600 dark:text-gray-400', ring: 'ring-gray-500/20' },
};

const RESULT_COLORS: Record<TimelineEntry['lastResult'], string> = {
  success: 'bg-green-500',
  failure: 'bg-red-500',
  pending: 'bg-yellow-500',
  unknown: 'bg-gray-400',
};

const ALL_TYPES: TimelineEntry['type'][] = ['cron', 'heartbeat', 'internal', 'manual', 'external'];

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  return `in ${hours}h ${mins % 60}m`;
}

export default function OpsTimeline({ entries, selectedId, onSelect }: Props) {
  const [activeFilters, setActiveFilters] = useState<Set<TimelineEntry['type']>>(new Set());

  function toggleFilter(type: TimelineEntry['type']) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const visible = activeFilters.size === 0
    ? entries
    : entries.filter((e) => activeFilters.has(e.type));

  return (
    <div className="bg-neo-bg border border-white/50 dark:border-white/5 rounded-[40px] flex flex-col h-full shadow-neo-flat overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-gray-300/30 dark:border-gray-700/30">
        <div className="flex items-center gap-3 mb-6 ml-2">
           <div className="neo-pressed p-2 rounded-xl text-blue-600 dark:text-blue-400">
             <span className="text-lg">🕒</span>
           </div>
           <div>
             <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Mission Timeline</h2>
             <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Next 48h Projection</p>
           </div>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-3 px-2">
          {ALL_TYPES.map((type) => {
            const meta = TYPE_META[type];
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl border transition-all ${
                  active
                    ? `neo-pressed ${meta.color} border-current`
                    : 'neo-button no-3d text-gray-500 border-white/10 dark:border-white/5'
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 italic">
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">No jobs match the current filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-300/20 dark:divide-gray-700/20">
            {visible.map((entry) => {
              const meta = TYPE_META[entry.type];
              const isSelected = entry.id === selectedId;
              return (
                <li
                  key={entry.id}
                  onClick={() => onSelect(entry.id)}
                  className={`flex items-start gap-4 px-8 py-5 cursor-pointer transition-all ${
                    isSelected ? 'bg-white/40 dark:bg-black/20 neo-glow-blue' : 'hover:bg-white/20 dark:hover:bg-black/10'
                  }`}
                >
                  {/* Result dot */}
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${RESULT_COLORS[entry.lastResult]} ${entry.lastResult === 'success' ? 'shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight truncate">{entry.name}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ring-1 ${meta.ring} ${meta.color} uppercase tracking-[0.2em] flex-shrink-0`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                      <span className="text-orange-600 dark:text-orange-400 uppercase tracking-widest">{relativeTime(entry.scheduledAt)}</span>
                      <span className="text-gray-500 dark:text-gray-500 font-mono">{new Date(entry.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {entry.detail && <span className="truncate text-gray-400 dark:text-gray-600 font-medium italic opacity-70">"{entry.detail}"</span>}
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-[8px] font-black bg-black/5 dark:bg-black/20 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-white/5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {entry.alertMuted && (
                    <span className="text-lg flex-shrink-0 mt-0.5 opacity-40">🔕</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
