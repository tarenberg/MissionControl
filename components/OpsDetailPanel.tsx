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
    <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-white/40 dark:bg-black/20 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full shadow-inner border border-white/20">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shadow-[0_0_5px_rgba(0,0,0,0.1)]`} />
      {label ?? status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-4 border-b border-gray-300/30 dark:border-gray-700/30 last:border-b-0">
      <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">{label}</span>
      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{value}</span>
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
        <div className="neo-pressed p-6 rounded-[40px] mb-6">
           <span className="text-5xl">📋</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selection Required</p>
      </div>
    );
  }

  const cronJob = cronJobs.find((j) => j.id === entry.id || j.name === entry.name);
  const internalJob = internalSchedulers.find((s) => `timeline-${s.id}` === entry.id);
  const externalJob = externalSchedulers.find((s) => `ext-${s.id}` === entry.id || s.name === entry.name);
  const isHeartbeat = entry.id === 'timeline-heartbeat';
  const description = getTimelineEntryDescription(entry);

  return (
    <div className="p-8 space-y-0">
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-300/50">
        <div>
          <h3 className="text-xl font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">{entry.name}</h3>
          <p className="text-[9px] font-bold text-blue-500 dark:text-blue-400 mt-1 uppercase tracking-widest">{entry.type} · {entry.detail ?? ''}</p>
        </div>
        <StatusBadge status={entry.lastResult} />
      </div>

      <DetailRow label="Objective" value={<p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic">"{description}"</p>} />

      <DetailRow label="Schedule Window" value={<span className="font-mono text-blue-600 dark:text-blue-400">{new Date(entry.scheduledAt).toLocaleString()}</span>} />
      <DetailRow
        label="Tags"
        value={
          <div className="flex flex-wrap gap-2 mt-2">
            {entry.tags.map((t) => (
              <span key={t} className="neo-pressed px-3 py-1 rounded-full text-[9px] font-black text-gray-500 uppercase tracking-widest">{t}</span>
            ))}
          </div>
        }
      />
      <DetailRow
        label="Alert Channel"
        value={<StatusBadge status={entry.alertMuted ? 'muted' : 'active'} label={entry.alertMuted ? '🔕 Muted' : '🔔 Monitoring Active'} />}
      />

      {/* Cron-specific */}
      {cronJob && (
        <>
          <DetailRow label="Cron Signature" value={<code className="text-green-600 dark:text-green-400 font-black tracking-widest">{cronJob.schedule}</code>} />
          <DetailRow label="Last Engagement" value={cronJob.lastRun ? <span className="font-mono">{cronJob.lastRun}</span> : '—'} />
          <DetailRow label="Next Engagement" value={cronJob.nextRun ? <span className="font-mono text-orange-500">{cronJob.nextRun}</span> : '—'} />
          <DetailRow label="Delivery Pipeline" value={<StatusBadge status={cronJob.deliveryStatus} />} />
          {cronJob.payloadSummary && <DetailRow label="Payload Data" value={<pre className="text-[10px] bg-black/5 dark:bg-black/40 p-3 rounded-xl border border-black/5">{cronJob.payloadSummary}</pre>} />}
        </>
      )}

      {/* Heartbeat-specific */}
      {isHeartbeat && (
        <>
          <DetailRow label="Pulse Status" value={<StatusBadge status={heartbeat.status} />} />
          <DetailRow label="Active Monitor" value={heartbeat.enabled ? '✅ ENABLED' : '❌ DISABLED'} />
          {heartbeat.lastUpdated && <DetailRow label="Last Pulse" value={new Date(heartbeat.lastUpdated).toLocaleString()} />}
          {heartbeat.contentLines.length > 0 && (
            <DetailRow
              label="Telemetry Preview"
              value={
                <pre className="text-[10px] text-gray-800 dark:text-gray-400 neo-pressed p-4 rounded-2xl mt-2 overflow-x-auto whitespace-pre-wrap max-h-40 font-mono">
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
          {internalJob.scriptPath && <DetailRow label="Script Source" value={<code className="text-purple-600 dark:text-purple-400 text-[10px] font-black">{internalJob.scriptPath}</code>} />}
          {internalJob.command && <DetailRow label="Execution Hook" value={<code className="text-purple-600 dark:text-purple-400 text-[10px] font-black">{internalJob.command}</code>} />}
          <DetailRow label="Verified Success" value={internalJob.lastSuccess ? <span className="font-mono">{new Date(internalJob.lastSuccess).toLocaleString()}</span> : '—'} />
        </>
      )}

      {/* Alert buttons */}
      <div className="flex gap-4 mt-10 pt-4">
        <button className="neo-button no-3d text-[10px] font-black uppercase tracking-widest bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 px-6 py-3 rounded-2xl transition-all shadow-neo-button active:neo-button-active">
          {entry.alertMuted ? '🔔 Unmute' : '🔕 Mute Feed'}
        </button>
        <button className="neo-button no-3d text-[10px] font-black uppercase tracking-widest bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-2xl transition-all shadow-neo-button active:neo-button-active">
          ▶ Force Execution
        </button>
      </div>
    </div>
  );
}

function ProcessesPane({ processes }: { processes: SerializedProcess[] }) {
  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
        <div className="neo-pressed p-6 rounded-[40px] mb-6">
           <span className="text-5xl">🖥️</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Active Nodes</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-300/30 dark:divide-gray-700/30">
      {processes.map((proc) => (
        <div key={proc.id} className="p-8 hover:bg-white/40 dark:hover:bg-black/10 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[proc.status] ?? 'bg-gray-400'} shadow-[0_0_8px_rgba(34,197,94,0.3)]`} />
                <span className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight truncate">{proc.name}</span>
              </div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1.5 ml-5 italic leading-tight">{proc.purpose}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Runtime</span>
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">{proc.runtime}</span>
            </div>
          </div>
          <div className="flex gap-3 ml-5">
            <button className="neo-button no-3d text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 shadow-neo-button active:neo-button-active">
              ⏹ Terminate
            </button>
            <button className="neo-button no-3d text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-black/20 shadow-neo-button active:neo-button-active">
              👁 Inspect
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
    <div className="p-8">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2">
        <span className="w-4 h-[1px] bg-gray-300 dark:bg-gray-700"></span>
        Environment Resource Monitors
        <span className="flex-1 h-[1px] bg-gray-300 dark:bg-gray-700"></span>
      </h4>
      <div className="space-y-4">
        {monitors.map((m) => (
          <div key={m.id} className="neo-pressed p-5 rounded-2xl flex items-center justify-between border border-white/10 dark:border-white/5 transition-all hover:neo-flat">
            <div>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">{m.name}</span>
              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 ml-3 uppercase tracking-widest opacity-60">System::{m.type}</span>
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
        <div className="neo-pressed p-6 rounded-[40px] mb-6">
           <span className="text-5xl">🤖</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Active Neural Nodes</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      {agents.map((agent) => (
        <div key={agent.id} className="neo-pressed p-6 rounded-3xl border border-white/10 dark:border-white/5 group hover:neo-flat transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">{agent.name}</span>
              <p className="text-[9px] font-black text-gray-500 dark:text-gray-500 mt-1 uppercase tracking-widest">Address: {agent.id}</p>
            </div>
            <div className="neo-flat px-4 py-2 rounded-xl border border-white/20 dark:border-white/5">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest neo-glow-blue">{agent.model}</span>
            </div>
          </div>
          <div className="h-[1px] w-full bg-gray-300/30 dark:bg-gray-700/30 mb-4"></div>
          <div className="flex items-center gap-3">
             <div className="flex-1 h-1.5 neo-pressed rounded-full overflow-hidden p-[1px]">
                <div className="h-full w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-80"></div>
             </div>
             <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Model Online</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OpsDetailPanel(props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'details', label: 'Telemetry' },
    { id: 'processes', label: 'Active Nodes', count: props.activeProcesses.length },
    { id: 'agents', label: 'Neural Models', count: props.agentModels.length },
  ];

  return (
    <div className="bg-neo-bg border border-white/50 dark:border-white/5 rounded-[40px] flex flex-col h-full shadow-neo-flat overflow-hidden">
      {/* Tabs */}
      <div className="flex p-3 bg-black/5 dark:bg-black/20 gap-2 border-b border-gray-300/30 dark:border-gray-700/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-[24px] ${
              activeTab === tab.id
                ? 'neo-pressed text-blue-600 dark:text-blue-400 shadow-inner'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-[8px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
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
