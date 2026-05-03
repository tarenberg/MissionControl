import React from 'react';
import type { ActivityLogEntry } from '@/lib/opsControlData';

// Serialized variant: timestamp arrives as an ISO string after server→client serialization
type SerializedLogEntry = Omit<ActivityLogEntry, 'timestamp'> & { timestamp: string };

interface Props {
  entries: SerializedLogEntry[];
}

const RESULT_META: Record<ActivityLogEntry['result'], { icon: string; color: string; dot: string }> = {
  success: { icon: '✓', color: 'text-green-600', dot: 'bg-green-500' },
  failure: { icon: '✗', color: 'text-red-600',   dot: 'bg-red-500' },
  alert:   { icon: '⚠', color: 'text-yellow-600', dot: 'bg-yellow-500' },
  info:    { icon: 'i', color: 'text-blue-600',   dot: 'bg-blue-500' },
};

const TYPE_LABELS: Record<ActivityLogEntry['type'], string> = {
  cron:      'CRON',
  heartbeat: 'HB',
  internal:  'INT',
  manual:    'MAN',
  external:  'EXT',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export default function OpsActivityLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
        <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Activity Log</h2>
        <p className="text-xs text-gray-400">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
          Activity Log
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-normal normal-case tracking-normal">
            latest {entries.length} events
          </span>
        </h2>
        <div className="flex gap-3 text-xs text-gray-500">
          {(['success', 'failure', 'alert', 'info'] as const).map((r) => {
            const meta = RESULT_META[r];
            const count = entries.filter((e) => e.result === r).length;
            if (count === 0) return null;
            return (
              <span key={r} className={`${meta.color} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${meta.dot}`} />
                {count} {r}
              </span>
            );
          })}
        </div>
      </div>

      {/* Scrollable log stream — monospace feel */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {entries.map((entry) => {
              const meta = RESULT_META[entry.result];
              return (
                <tr
                  key={entry.id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  {/* Result icon */}
                  <td className={`pl-4 pr-2 py-2 w-6 ${meta.color} font-bold`}>{meta.icon}</td>
                  {/* Timestamp */}
                  <td className="pr-3 py-2 text-gray-500 whitespace-nowrap w-20">
                    {timeAgo(entry.timestamp)}
                  </td>
                  {/* Type badge */}
                  <td className="pr-3 py-2 w-12">
                    <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                      {TYPE_LABELS[entry.type]}
                    </span>
                  </td>
                  {/* Job name */}
                  <td className="pr-3 py-2 text-gray-800 whitespace-nowrap w-40 truncate max-w-[160px]">
                    {entry.jobName}
                  </td>
                  {/* Message */}
                  <td className="py-2 pr-4 text-gray-500 truncate max-w-xs">
                    {entry.message}
                  </td>
                  {/* Absolute time */}
                  <td className="py-2 pr-4 text-gray-400 whitespace-nowrap text-right hidden lg:table-cell">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
