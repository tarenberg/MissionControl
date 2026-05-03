'use client';

import React, { useState } from 'react';
import type {
  TimelineEntry,
  ActiveProcess,
  CronJobItem,
  HeartbeatInfo,
  InternalScheduler,
  ExternalScheduler,
  ResourceMonitor,
  AgentModelItem,
} from '@/lib/opsControlData';

// Serialized variants: Date fields become strings at the server→client boundary
type SerializedEntry = Omit<TimelineEntry, 'scheduledAt'> & { scheduledAt: string };
type SerializedCronJob = Omit<CronJobItem, 'nextRun' | 'lastRun'> & { nextRun: string | null; lastRun: string | null };
type SerializedProcess = Omit<ActiveProcess, 'startedAt'> & { startedAt: string };
type SerializedHeartbeat = Omit<HeartbeatInfo, 'lastUpdated'> & { lastUpdated: string | null };
type SerializedScheduler = Omit<InternalScheduler, 'lastSuccess'> & { lastSuccess: string | null };
type SerializedExternal = Omit<ExternalScheduler, 'lastRun'> & { lastRun: string | null };
type SerializedMonitor = Omit<ResourceMonitor, 'lastChecked'> & { lastChecked: string };

interface Props {
  selectedEntry: SerializedEntry | null;
  activeProcesses: SerializedProcess[];
  cronJobs: SerializedCronJob[];
  cronError?: string;
  heartbeat: SerializedHeartbeat;
  internalSchedulers: SerializedScheduler[];
  externalSchedulers: SerializedExternal[];
  externalError?: string;
  resourceMonitors: SerializedMonitor[];
  agentModels: AgentModelItem[];
}

type Tab = 'details' | 'processes' | 'agents';

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-400',
  paused: 'bg-yellow-400',
  error: 'bg-red-400',
  unknown: 'bg-gray-400',
  running: 'bg-green-400',
  idle: 'bg-yellow-400',
  ok: 'bg-green-400',
  stale: 'bg-yellow-400',
  'not-configured': 'bg-gray-400',
  connected: 'bg-green-400',
  disconnected: 'bg-gray-400',
};

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const dot = STATUS_DOT[status] ?? 'bg-gray-400';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label ?? status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-200 last:border-b-0">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function getTimelineEntryDescription(entry: SerializedEntry): string {
  const descriptions: Record<string, string> = {
    'Morning Kickoff': 'Daily agent briefing and task coordination. Reviews overnight activity and sets priorities for the day.',
    'Trend Radar Daily Digest': 'Compiles and delivers research findings, technology trends, and industry updates.',
    'Evening Wrap Up': 'End-of-day summary generation. Documents completed tasks and prepares for next day.',
    'Memory Summaries': 'Processes daily memory files and generates AI-powered summaries of key decisions, projects, and lessons learned.',
    'Ensure Daily Memory': 'Creates the daily memory file if it does not exist, ensuring continuity of daily logging.',
    'Heartbeat Check': 'Monitors system health by checking HEARTBEAT.md freshness. Alerts if no activity detected in 30+ minutes.',
    'YouTube OpenClaw': 'Scheduled content creation and publishing for OpenClaw YouTube channel.',
    'Scout Morning Research': 'Morning research session conducted by Scout agent to gather fresh information and insights.',
    'Morning Brief': 'Quick morning status update and briefing for the day ahead.',
    'Quill Script Writer': 'Automated script writing and content generation for documentation or presentations.',
    'Daily Digest': 'Compilation of daily activities, notifications, and important updates.',
    'Stock Scarcity Research': 'Weekly research on stock availability, scarcity trends, and supply chain updates.',
    'Weekly Newsletter': 'End-of-week newsletter compilation with highlights, updates, and upcoming events.',
  };
  
  return descriptions[entry.name] || `${entry.type === 'cron' ? 'Automated scheduled task' : entry.type === 'internal' ? 'Internal system task' : entry.type === 'manual' ? 'Manual task or event' : 'System event'} that runs on a ${entry.type === 'cron' ? 'scheduled basis' : 'as needed basis'}.`;
}

function JobDetailsPane({ entry, cronJobs, heartbeat, internalSchedulers, externalSchedulers }: {
  entry: SerializedEntry | null;
  cronJobs: SerializedCronJob[];
  heartbeat: SerializedHeartbeat;
  internalSchedulers: SerializedScheduler[];
  externalSchedulers: SerializedExternal[];
}) {
  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
        <span className="text-4xl mb-3">📋</span>
        Select a timeline entry to view details
      </div>
    );
  }

  const cronJob = cronJobs.find((j) => j.id === entry.id || j.name === entry.name);
  const internalJob = internalSchedulers.find((s) => `timeline-${s.id}` === entry.id);
  const externalJob = externalSchedulers.find((s) => `ext-${s.id}` === entry.id || s.name === entry.name);
  const isHeartbeat = entry.id === 'timeline-heartbeat';
  const description = getTimelineEntryDescription(entry);

  return (
    <div className="p-4 space-y-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{entry.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{entry.type.toUpperCase()} · {entry.detail ?? ''}</p>
        </div>
        <StatusBadge status={entry.lastResult} />
      </div>

      <DetailRow label="Description" value={<p className="text-sm text-gray-600 leading-relaxed">{description}</p>} />

      <DetailRow label="Scheduled At" value={new Date(entry.scheduledAt).toLocaleString()} />
      <DetailRow
        label="Tags"
        value={
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.tags.map((t) => (
              <span key={t} className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>
        }
      />
      <DetailRow
        label="Alert"
        value={<StatusBadge status={entry.alertMuted ? 'muted' : 'active'} label={entry.alertMuted ? '🔕 Muted' : '🔔 Active'} />}
      />

      {/* Cron-specific */}
      {cronJob && (
        <>
          <DetailRow label="Schedule" value={<code className="text-green-600 text-xs">{cronJob.schedule}</code>} />
          <DetailRow label="Last Run" value={cronJob.lastRun ? cronJob.lastRun : '—'} />
          <DetailRow label="Next Run" value={cronJob.nextRun ? cronJob.nextRun : '—'} />
          <DetailRow label="Delivery" value={<StatusBadge status={cronJob.deliveryStatus} />} />
          {cronJob.payloadSummary && <DetailRow label="Payload" value={cronJob.payloadSummary} />}
        </>
      )}

      {/* Heartbeat-specific */}
      {isHeartbeat && (
        <>
          <DetailRow label="Heartbeat Status" value={<StatusBadge status={heartbeat.status} />} />
          <DetailRow label="Enabled" value={heartbeat.enabled ? '✅ Yes' : '❌ No'} />
          {heartbeat.lastUpdated && <DetailRow label="Last Updated" value={new Date(heartbeat.lastUpdated).toLocaleString()} />}
          {heartbeat.contentLines.length > 0 && (
            <DetailRow
              label="HEARTBEAT.md Preview"
              value={
                <pre className="text-xs text-gray-800 bg-gray-100 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {heartbeat.contentLines.join('\n')}
                </pre>
              }
            />
          )}
        </>
      )}

      {/* Internal scheduler */}
      {internalJob && (
        <>
          {internalJob.scriptPath && <DetailRow label="Script" value={<code className="text-purple-600 text-xs">{internalJob.scriptPath}</code>} />}
          {internalJob.command && <DetailRow label="Command" value={<code className="text-purple-600 text-xs">{internalJob.command}</code>} />}
          <DetailRow label="Last Success" value={internalJob.lastSuccess ? new Date(internalJob.lastSuccess).toLocaleString() : '—'} />
        </>
      )}

      {/* External scheduler */}
      {externalJob && (
        <>
          <DetailRow label="Owner" value={externalJob.owner} />
          <DetailRow label="Cadence" value={externalJob.cadence} />
        </>
      )}

      {/* Alert buttons */}
      <div className="flex gap-2 mt-4 pt-2">
        <button className="text-xs bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded transition-colors">
          {entry.alertMuted ? '🔔 Unmute' : '🔕 Mute'}
        </button>
        <button className="text-xs bg-gray-200 hover:bg-gray-300 text-black px-3 py-1.5 rounded transition-colors">
          ▶ Run Now
        </button>
        {cronJob && (
          <a 
            href={`/ops/edit/${cronJob.id}`}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-black px-3 py-1.5 rounded transition-colors inline-flex items-center"
          >
            ✏️ Edit
          </a>
        )}
      </div>
    </div>
  );
}

function ProcessesPane({ processes }: { processes: SerializedProcess[] }) {
  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
        <span className="text-4xl mb-3">🖥️</span>
        No active processes detected
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {processes.map((proc) => (
        <div key={proc.id} className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[proc.status] ?? 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900 truncate">{proc.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-4">{proc.purpose}</p>
            </div>
            <span className="text-xs text-gray-500 ml-3 flex-shrink-0">Runtime: {proc.runtime}</span>
          </div>
          <div className="flex gap-2 ml-4">
            <button className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2.5 py-1 rounded transition-colors">
              ⏹ Kill
            </button>
            <button className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2.5 py-1 rounded transition-colors">
              👁 Monitor
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceMonitorPane({ monitors }: { monitors: SerializedMonitor[] }) {
  if (monitors.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-gray-500 px-4 pt-4 pb-2">Resource Monitors</h4>
      <div className="divide-y divide-gray-200">
        {monitors.map((m) => (
          <div key={m.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-800">{m.name}</span>
              <span className="text-xs text-gray-500 ml-2">{m.type}</span>
            </div>
            <StatusBadge status={m.connectionState} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentModelsPane({ agents }: { agents: AgentModelItem[] }) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-sm">
        <span className="text-4xl mb-3">🤖</span>
        No agent model data available
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {agents.map((agent) => (
        <div key={agent.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900">{agent.name}</span>
              <p className="text-xs text-gray-500">ID: {agent.id}</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{agent.model}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OpsDetailPanel(props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'details', label: 'Job Details' },
    { id: 'processes', label: 'Active Processes', count: props.activeProcesses.length },
    { id: 'agents', label: 'Agent Models', count: props.agentModels.length },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg flex flex-col h-full shadow-lg">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <JobDetailsPane
            entry={props.selectedEntry}
            cronJobs={props.cronJobs}
            heartbeat={props.heartbeat}
            internalSchedulers={props.internalSchedulers}
            externalSchedulers={props.externalSchedulers}
          />
        )}
        {activeTab === 'processes' && (
          <>
            <ProcessesPane processes={props.activeProcesses} />
            <ResourceMonitorPane monitors={props.resourceMonitors} />
          </>
        )}
        {activeTab === 'agents' && (
          <AgentModelsPane agents={props.agentModels} />
        )}
      </div>
    </div>
  );
}
