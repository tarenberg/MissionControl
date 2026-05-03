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

const TYPE_META: Record<TimelineEntry['type'], { label: string; icon: string; color: string }> = {
  cron:      { label: 'Cron',      icon: '⏰', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  heartbeat: { label: 'Heartbeat', icon: '💓', color: 'bg-green-100 text-green-800 border-green-300' },
  internal:  { label: 'Internal',  icon: '⚙️',  color: 'bg-purple-100 text-purple-800 border-purple-300' },
  manual:    { label: 'Manual',    icon: '🖐️',  color: 'bg-orange-100 text-orange-800 border-orange-300' },
  external:  { label: 'External',  icon: '🌐',  color: 'bg-gray-200 text-gray-800 border-gray-400' },
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
    <div className="bg-white border border-gray-200 rounded-lg flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Timeline · Next 48h</h2>
        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => {
            const meta = TYPE_META[type];
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  active
                    ? meta.color
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm text-center">No jobs match the current filters.</p>
        ) : (
          <ul>
            {visible.map((entry) => {
              const meta = TYPE_META[entry.type];
              const isSelected = entry.id === selectedId;
              return (
                <li
                  key={entry.id}
                  onClick={() => onSelect(entry.id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors ${
                    isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Result dot */}
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${RESULT_COLORS[entry.lastResult]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{entry.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${meta.color} flex-shrink-0`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="text-amber-600 font-medium">{relativeTime(entry.scheduledAt)}</span>
                      <span>{new Date(entry.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {entry.detail && <span className="truncate">{entry.detail}</span>}
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {entry.alertMuted && (
                    <span className="text-xs text-yellow-600 flex-shrink-0 mt-1">🔕</span>
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
