import React from 'react';

// All date fields arrive as ISO strings after server→client serialization
interface SerializedSummary {
  totalJobs: number;
  nextJobFires: string | null;
  nextJobName: string;
  lastRunStatus: 'success' | 'failure' | 'unknown';
  mutedAlerts: number;
}

interface Props {
  summary: SerializedSummary;
  fetchedAt: string;
}

function StatusDot({ status }: { status: 'success' | 'failure' | 'unknown' }) {
  const colors = {
    success: 'bg-green-400',
    failure: 'bg-red-400',
    unknown: 'bg-gray-500',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]} mr-2`} />;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  return `in ${hours}h ${mins % 60}m`;
}

export default function OpsSummaryBar({ summary, fetchedAt }: Props) {
  const cards = [
    {
      label: 'Total Jobs',
      value: String(summary.totalJobs),
      sub: 'scheduled in next 48h',
      icon: '📊',
      glow: 'neo-glow-blue',
    },
    {
      label: 'Next Pulse',
      value: relativeTime(summary.nextJobFires),
      sub: summary.nextJobName,
      icon: '⏰',
      glow: 'neo-glow-orange',
    },
    {
      label: 'Last Run',
      value: summary.lastRunStatus === 'success' ? 'OK' : summary.lastRunStatus === 'failure' ? 'FAULT' : '???',
      sub: (
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${summary.lastRunStatus === 'success' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : summary.lastRunStatus === 'failure' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-gray-500'}`} />
          {summary.lastRunStatus}
        </span>
      ),
      icon: '⚡',
      glow: summary.lastRunStatus === 'success' ? 'neo-glow-green' : summary.lastRunStatus === 'failure' ? 'neo-glow-red' : '',
    },
    {
      label: 'Muted Alerts',
      value: String(summary.mutedAlerts),
      sub: summary.mutedAlerts === 0 ? 'all channels active' : 'sub-routines silenced',
      icon: '🔕',
      glow: summary.mutedAlerts > 0 ? 'neo-glow-orange' : '',
    },
  ];

  return (
    <div className="mb-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="neo-flat rounded-[32px] p-6 border border-white/50 dark:border-white/5 shadow-neo-flat relative overflow-hidden group"
          >
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span className="text-3xl">{card.icon}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">{card.label}</p>
            <p className={`text-2xl font-black text-gray-800 dark:text-gray-200 tracking-tighter ${card.glow}`}>{card.value}</p>
            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-500 mt-2 uppercase tracking-widest">{card.sub}</div>
          </div>
        ))}
      </div>
      <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 mt-4 text-right uppercase tracking-[0.3em]">
        Telemetry Sync: {new Date(fetchedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
