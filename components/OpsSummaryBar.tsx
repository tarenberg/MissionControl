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
      accent: 'border-blue-500',
      valueColor: 'text-blue-900',
    },
    {
      label: 'Next Job Fires',
      value: relativeTime(summary.nextJobFires),
      sub: summary.nextJobName,
      accent: 'border-amber-500',
      valueColor: 'text-amber-900',
    },
    {
      label: 'Last Run Status',
      value: summary.lastRunStatus === 'success' ? 'OK' : summary.lastRunStatus === 'failure' ? 'FAILED' : 'Unknown',
      sub: (
        <span className="flex items-center">
          <StatusDot status={summary.lastRunStatus} />
          {summary.lastRunStatus}
        </span>
      ),
      accent: summary.lastRunStatus === 'success' ? 'border-green-500' : summary.lastRunStatus === 'failure' ? 'border-red-500' : 'border-gray-500',
      valueColor: summary.lastRunStatus === 'success' ? 'text-green-900' : summary.lastRunStatus === 'failure' ? 'text-red-900' : 'text-gray-900',
    },
    {
      label: 'Muted Alerts',
      value: String(summary.mutedAlerts),
      sub: summary.mutedAlerts === 0 ? 'all alerts active' : 'jobs silenced',
      accent: summary.mutedAlerts > 0 ? 'border-yellow-500' : 'border-gray-600',
      valueColor: summary.mutedAlerts > 0 ? 'text-yellow-900' : 'text-gray-900',
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-white border border-gray-200 border-l-4 ${card.accent} rounded-lg p-4 shadow-lg`}
          >
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-right">
        Refreshed at {new Date(fetchedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
