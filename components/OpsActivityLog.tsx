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
      <div className="neo-flat rounded-[32px] p-10 border border-white/50 dark:border-white/5 shadow-neo-flat">
        <div className="flex items-center gap-3 mb-4">
           <div className="neo-pressed p-2 rounded-xl text-gray-400">
             <span className="text-lg">📜</span>
           </div>
           <h2 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] m-0">Activity Log</h2>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-50 italic ml-12">System idle. No recent events detected.</p>
      </div>
    );
  }

  return (
    <div className="neo-flat rounded-[40px] border border-white/50 dark:border-white/5 shadow-neo-flat overflow-hidden">
      <div className="px-10 py-8 border-b border-gray-300/30 dark:border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="neo-pressed p-3 rounded-2xl text-blue-600 dark:text-blue-400">
             <span className="text-xl neo-glow-blue">📜</span>
           </div>
           <div>
             <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Operation Stream</h2>
             <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Latest {entries.length} Atomic Events</p>
           </div>
        </div>
        
        <div className="flex gap-4">
          {(['success', 'failure', 'alert', 'info'] as const).map((r) => {
            const meta = RESULT_META[r];
            const count = entries.filter((e) => e.result === r).length;
            if (count === 0) return null;
            return (
              <div key={r} className="neo-pressed px-4 py-2 rounded-xl flex items-center gap-2 group hover:neo-flat transition-all cursor-default">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${r === 'success' ? 'shadow-[0_0_5px_rgba(34,197,94,0.5)]' : ''}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color}`}>{count} {r}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable log stream — monospace feel */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-[10px] font-mono border-collapse">
          <thead>
            <tr className="bg-black/5 dark:bg-black/10 text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              <th className="pl-10 py-4 text-left font-black w-12">Res</th>
              <th className="py-4 text-left font-black w-24">Rel Time</th>
              <th className="py-4 text-left font-black w-20">Class</th>
              <th className="py-4 text-left font-black w-48">Identifier</th>
              <th className="py-4 text-left font-black">Data Payload</th>
              <th className="pr-10 py-4 text-right font-black hidden lg:table-cell">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300/10 dark:divide-gray-700/10">
            {entries.map((entry) => {
              const meta = RESULT_META[entry.result];
              return (
                <tr
                  key={entry.id}
                  className="group hover:bg-white/20 dark:hover:bg-black/10 transition-colors"
                >
                  <td className={`pl-10 py-4 ${meta.color} font-black text-xs`}>{meta.icon}</td>
                  <td className="py-4 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-tighter">
                    {timeAgo(entry.timestamp)}
                  </td>
                  <td className="py-4">
                    <span className="neo-pressed px-2 py-0.5 rounded-md text-[8px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest border border-white/5">
                      {TYPE_LABELS[entry.type]}
                    </span>
                  </td>
                  <td className="py-4 text-gray-800 dark:text-gray-200 font-black uppercase tracking-tight truncate max-w-[160px]">
                    {entry.jobName}
                  </td>
                  <td className="py-4 text-gray-500 dark:text-gray-500 font-medium truncate max-w-xs pr-4 italic">
                    {entry.message}
                  </td>
                  <td className="py-4 pr-10 text-gray-400 dark:text-gray-600 font-bold text-right hidden lg:table-cell opacity-50 group-hover:opacity-100 transition-opacity">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false })}
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
