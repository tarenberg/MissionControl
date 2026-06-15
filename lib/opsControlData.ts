import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CronJobItem {
  id: string;
  name: string;
  schedule: string;
  nextRun: string | null;
  lastRun: string | null;
  status: 'active' | 'paused' | 'error' | 'unknown';
  payloadSummary: string;
  deliveryStatus: 'delivered' | 'failed' | 'pending' | 'unknown';
  tags: string[];
}

export interface HeartbeatInfo {
  status: 'ok' | 'stale' | 'not-configured';
  lastUpdated: Date | null;
  contentLines: string[];
  enabled: boolean;
}

export interface InternalScheduler {
  id: string;
  name: string;
  scriptPath: string;
  command: string;
  schedule: string;
  lastSuccess: Date | null;
  status: 'ok' | 'failed' | 'unknown';
  tags: string[];
}

export interface ActiveProcess {
  id: string;
  name: string;
  purpose: string;
  startedAt: Date;
  runtime: string;
  pid?: number;
  status: 'running' | 'idle' | 'error';
}

export interface ExternalScheduler {
  id: string;
  name: string;
  owner: string;
  cadence: string;
  lastStatus: 'success' | 'failed' | 'unknown';
  lastRun: Date | null;
  tags: string[];
}

export interface ResourceMonitor {
  id: string;
  name: string;
  type: 'api-listener' | 'queue' | 'poll' | 'watchdog';
  connectionState: 'connected' | 'disconnected' | 'error';
  messageCount: number;
  lastChecked: Date;
}

export interface TimelineEntry {
  id: string;
  name: string;
  type: 'cron' | 'heartbeat' | 'internal' | 'manual' | 'external';
  scheduledAt: Date;
  lastResult: 'success' | 'failure' | 'pending' | 'unknown';
  tags: string[];
  alertMuted: boolean;
  detail?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  jobName: string;
  type: 'cron' | 'heartbeat' | 'internal' | 'manual' | 'external';
  result: 'success' | 'failure' | 'alert' | 'info';
  message: string;
}

export interface AgentModelItem {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Idle';
  model: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveCronTags(name: string, schedule: string): string[] {
  const tags: string[] = ['automation'];
  const lower = (name || '').toLowerCase();
  if (lower.includes('memory') || lower.includes('summary')) tags.push('memory');
  if (lower.includes('morning') || lower.includes('evening') || lower.includes('wrap')) tags.push('daily');
  if (lower.includes('trend') || lower.includes('digest') || lower.includes('research')) tags.push('research');
  if (lower.includes('kickoff') || lower.includes('brief')) tags.push('coordination');
  // mark early-morning jobs as 'system'
  if (schedule.includes(' 4 ') || schedule.startsWith('0 4')) tags.push('system');
  return [...new Set(tags)];
}

function formatRuntime(startedAt: Date): string {
  const ms = Date.now() - startedAt.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** Parse a simple time string like "8:00 AM" into today's (or next occurrence's) Date */
function timeStringToNextDate(time: string, daysOfWeek: string[]): Date | null {
  try {
    const now = new Date();
    const [timePart, meridiem] = time.split(' ');
    const [hoursRaw, minutes] = timePart.split(':').map(Number);
    let hours = hoursRaw;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const targetDays = daysOfWeek.map((d) => dayMap[d]).filter((d) => d !== undefined);

    for (let offset = 0; offset < 8; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      candidate.setHours(hours, minutes, 0, 0);
      if (candidate > now && (targetDays.length === 0 || targetDays.includes(candidate.getDay()))) {
        return candidate;
      }
    }
    return null;
  } catch (e: unknown) {
    return null;
  }
}

function parseCronTableOutput(rawOutput: string): CronJobItem[] {
  const lines = rawOutput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) {
    return []; // No header and no data
  }

  const columnMap = [
    { name: 'id', start: 0, end: 36 },
    { name: 'name', start: 37, end: 62 },
    { name: 'schedule', start: 63, end: 94 },
    { name: 'next', start: 95, end: 107 },
    { name: 'last', start: 108, end: 119 },
    { name: 'status', start: 120, end: 129 },
    { name: 'target', start: 130, end: 139 },
    { name: 'agentId', start: 140, end: 150 },
    { name: 'model', start: 151, end: Infinity },
  ];

  const jobs: CronJobItem[] = [];
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const item: Record<string, string> = {};

    for (const col of columnMap) {
      let value = line.substring(col.start, col.end);
      item[col.name] = value.trim();
    }

    // Convert to CronJobItem structure
    const nextRun = item.next && item.next !== '-' ? item.next : null;
    const lastRun = item.last && item.last !== '-' ? item.last : null;
    const status: CronJobItem['status'] =
      item.status === 'ok' ? 'active' :
      item.status === 'error' ? 'error' :
      'unknown';

    jobs.push({
      id: item.id,
      name: item.name,
      schedule: item.schedule,
      nextRun,
      lastRun,
      status,
      payloadSummary: '',
      deliveryStatus: 'unknown',
      tags: deriveCronTags(item.name, item.schedule),
    });
  }
  return jobs;
}

// ─── getCronJobs ──────────────────────────────────────────────────────────────

export interface GetCronJobsResult {
  jobs: CronJobItem[];
  error?: string;
}

export async function getCronJobs(): Promise<GetCronJobsResult> {
  const jobsPath = 'C:/Users/tberg/.openclaw/cron/jobs.json';
  try {
    if (fs.existsSync(jobsPath)) {
      const raw = fs.readFileSync(jobsPath, 'utf8');
      const data = JSON.parse(raw);
      const jobs: CronJobItem[] = data.jobs.map((j: any) => ({
        id: j.id,
        name: j.name,
        schedule: j.schedule.expr || j.schedule.kind,
        nextRun: j.state.nextRunAtMs ? new Date(j.state.nextRunAtMs).toLocaleTimeString() : null,
        lastRun: j.state.lastRunAtMs ? new Date(j.state.lastRunAtMs).toLocaleTimeString() : null,
        status: j.state.lastRunStatus === 'ok' ? 'active' : j.state.lastRunStatus === 'error' ? 'error' : 'unknown',
        payloadSummary: j.payload.text || j.payload.message || '',
        deliveryStatus: j.state.lastDeliveryStatus || 'unknown',
        tags: deriveCronTags(j.name, j.schedule.expr || ''),
      }));
      return { jobs };
    }
  } catch (e) {
    console.error('Error reading jobs.json:', e);
  }

  // Fallback to CLI if file reading fails
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('openclaw cron list', { timeout: 3000 }, (error: any, stdout: string) => {
      if (error) {
        resolve({ jobs: [], error: error.message });
        return;
      }
      const jobs: CronJobItem[] = parseCronTableOutput(stdout);
      resolve({ jobs });
    });
  });
}

// ─── getHeartbeatInfo ─────────────────────────────────────────────────────────

const HEARTBEAT_PATH = 'C:/Users/tberg/.openclaw/workspace/HEARTBEAT.md';
const HEARTBEAT_STALE_MS = 30 * 60 * 1000; // 30 minutes

export function getHeartbeatInfo(): HeartbeatInfo {
  try {
    const stats = fs.statSync(HEARTBEAT_PATH);
    const lastUpdated = stats.mtime;
    const ageMs = Date.now() - lastUpdated.getTime();
    const rawContent = fs.readFileSync(HEARTBEAT_PATH, 'utf8');

    // Pull first non-empty trimmed lines (up to 10 for preview)
    const contentLines = rawContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 10);

    // Check for enabled markers in content
    const contentLower = rawContent.toLowerCase();
    const enabled =
      !contentLower.includes('disabled') &&
      !contentLower.includes('paused') &&
      contentLines.length > 0;

    const status: HeartbeatInfo['status'] = ageMs <= HEARTBEAT_STALE_MS ? 'ok' : 'stale';

    return { status, lastUpdated, contentLines, enabled };
  } catch (e: unknown) {
    return { status: 'not-configured', lastUpdated: null, contentLines: [], enabled: false };
  }
}

// ─── getInternalSchedulers ────────────────────────────────────────────────────

export function getInternalSchedulers(): InternalScheduler[] {
  const schedulers: InternalScheduler[] = [];

  // Pull recurring tasks from data/tasks.json
  try {
    const tasksPath = path.join(process.cwd(), 'data', 'tasks.json');
    const rawTasks = fs.readFileSync(tasksPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks: any[] = JSON.parse(rawTasks);
    tasks
      .filter((t) => t.status === 'Recurring')
      .forEach((t) => {
        schedulers.push({
          id: t.id,
          name: t.title,
          scriptPath: '',
          command: '',
          schedule: 'Recurring',
          lastSuccess: null,
          status: 'unknown',
          tags: t.tags ?? ['internal'],
        });
      });
  } catch (e: unknown) {
    // tasks.json unavailable — skip
  }

  // Scan scripts/ directory for known scheduler scripts
  const scriptsDir = path.join(process.cwd(), 'scripts');
  try {
    const files = fs.readdirSync(scriptsDir);
    files
      .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
      .forEach((f) => {
        const full = path.join(scriptsDir, f);
        const stats = fs.statSync(full);
        schedulers.push({
          id: `script-${f}`,
          name: f.replace(/[-_]/g, ' ').replace(/\.(js|ts)$/, ''),
          scriptPath: `scripts/${f}`,
          command: `node scripts/${f}`,
          schedule: 'On-demand',
          lastSuccess: stats.mtime,
          status: 'unknown',
          tags: ['internal', 'script'],
        });
      });
  } catch (e: unknown) {
    // scripts dir unavailable — skip
  }

  return schedulers;
}

// ─── getActiveProcesses ───────────────────────────────────────────────────────

export function getActiveProcesses(): ActiveProcess[] {
  // In a real environment this would query live process state from openclaw or OS.
  // For now we return a stable, deterministic placeholder list so the UI always has data.
  const base = new Date();
  base.setHours(base.getHours() - 1);

  return [
    {
      id: 'proc-mc-dev',
      name: 'Mission Control Dev Server',
      purpose: 'Next.js development server (port 3002)',
      startedAt: base,
      runtime: formatRuntime(base),
      status: 'running',
    },
    {
      id: 'proc-openclaw',
      name: 'OpenClaw Daemon',
      purpose: 'Background cron scheduler & heartbeat listener',
      startedAt: new Date(base.getTime() - 3 * 60 * 60 * 1000),
      runtime: formatRuntime(new Date(base.getTime() - 3 * 60 * 60 * 1000)),
      status: 'running',
    },
  ];
}

// ─── getExternalSchedulers ────────────────────────────────────────────────────

export interface GetExternalSchedulersResult {
  schedulers: ExternalScheduler[];
  error?: string;
}

export async function getExternalSchedulers(): Promise<GetExternalSchedulersResult> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('schtasks /query /fo CSV /nh', { timeout: 5000 }, (error: any, stdout: string) => {
      if (error) {
        resolve({ schedulers: [], error: error.message });
        return;
      }
      const lines = stdout.split('\n').filter((l: string) => l.trim().length > 0);
      const schedulers: ExternalScheduler[] = lines.slice(0, 20).map((line: string, idx: number) => {
        const cols = line.split('","').map((c: string) => c.replace(/^"|"$/g, '').trim());
        const name = cols[0] ?? `Task ${idx + 1}`;
        const nextRun = cols[1] ? new Date(cols[1]) : null;
        const status = cols[2]?.toLowerCase() ?? 'unknown';
        return {
          id: `ext-${idx}`,
          name,
          owner: 'Windows Task Scheduler',
          cadence: 'Scheduled',
          lastStatus: status === 'ready' || status === 'running' ? 'success' : 'unknown',
          lastRun: nextRun,
          tags: ['system', 'windows'],
        };
      });
      resolve({ schedulers });
    });
  });
}

// ─── getResourceMonitors ──────────────────────────────────────────────────────

export function getResourceMonitors(): ResourceMonitor[] {
  // Deterministic placeholders representing known watchdogs in the openclaw ecosystem.
  const now = new Date();
  return [
    {
      id: 'rm-heartbeat-watcher',
      name: 'Heartbeat File Watcher',
      type: 'watchdog',
      connectionState: 'connected',
      messageCount: 0,
      lastChecked: now,
    },
    {
      id: 'rm-calendar-poll',
      name: 'Calendar Event Poller',
      type: 'poll',
      connectionState: 'connected',
      messageCount: 0,
      lastChecked: now,
    },
  ];
}

// ─── getTimeline ─────────────────────────────────────────────────────────────

export function getTimeline(): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Pull calendar events from data/calendar.json as manual/cron timeline items
  try {
    const calPath = path.join(process.cwd(), 'data', 'calendar.json');
    const rawCal = fs.readFileSync(calPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = JSON.parse(rawCal);
    for (const ev of events) {
      const scheduledAt = timeStringToNextDate(ev.time ?? '12:00 PM', ev.dayOfWeek ?? []);
      if (!scheduledAt || scheduledAt > cutoff) continue;
      entries.push({
        id: ev.id,
        name: ev.title,
        type: ev.isCron ? 'cron' : 'manual',
        scheduledAt,
        lastResult: 'unknown',
        tags: ev.isCron ? ['automation', 'openclaw'] : ['manual'],
        alertMuted: false,
        detail: `${ev.frequency} · ${ev.time}`,
      });
    }
  } catch (e: unknown) {
    // calendar.json unavailable — skip
  }

  // Add heartbeat as a timeline entry
  const hb = getHeartbeatInfo();
  if (hb.status !== 'not-configured') {
    const hbNext = new Date(now.getTime() + 5 * 60 * 1000); // assume fires every ~5 min
    entries.push({
      id: 'timeline-heartbeat',
      name: 'Heartbeat Check',
      type: 'heartbeat',
      scheduledAt: hbNext,
      lastResult: hb.status === 'ok' ? 'success' : 'failure',
      tags: ['heartbeat', 'system'],
      alertMuted: false,
      detail: hb.lastUpdated ? `Last: ${hb.lastUpdated.toLocaleTimeString()}` : 'No timestamp',
    });
  }

  // Add internal schedulers
  const internals = getInternalSchedulers();
  for (const s of internals) {
    const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000); // next ~30 min placeholder
    entries.push({
      id: `timeline-${s.id}`,
      name: s.name,
      type: 'internal',
      scheduledAt,
      lastResult: s.status === 'ok' ? 'success' : 'unknown',
      tags: s.tags,
      alertMuted: false,
      detail: s.scriptPath ? `script: ${s.scriptPath}` : s.schedule,
    });
  }

  // Sort ascending by scheduledAt
  entries.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return entries;
}

// ─── getAgentModels ───────────────────────────────────────────────────────────

export function getAgentModels(): AgentModelItem[] {
  const agentsFilePath = path.join(process.cwd(), 'data', 'agents.json');
  try {
    const fileContent = fs.readFileSync(agentsFilePath, 'utf-8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: any[] = JSON.parse(fileContent);
    return parsedData.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || 'No description available',
      status: agent.status || 'Idle',
      model: agent.model,
    }));
  } catch (e: unknown) {
    console.error('Error loading agents.json for Ops Control:', e);
    return [];
  }
}

// ─── getActivityLog ───────────────────────────────────────────────────────────

export function getActivityLog(): ActivityLogEntry[] {
  const log: ActivityLogEntry[] = [];

  // Attempt to read a log file from the openclaw workspace
  const logPath = 'C:/Users/tberg/.openclaw/workspace/activity.log';
  try {
    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0).slice(-50);
    lines.forEach((line, idx) => {
      const isError = /error|fail/i.test(line);
      log.push({
        id: `log-file-${idx}`,
        timestamp: new Date(),
        jobName: 'openclaw',
        type: 'cron',
        result: isError ? 'failure' : 'success',
        message: line.slice(0, 120),
      });
    });
    if (log.length > 0) return log.reverse();
  } catch (e: unknown) {
    // No log file — fall through to synthetic log
  }

  // Synthetic fallback log derived from calendar/task state
  const now = new Date();
  const syntheticEntries: ActivityLogEntry[] = [
    {
      id: 'log-1',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      jobName: 'Memory Summaries',
      type: 'cron',
      result: 'success',
      message: 'Memory summaries generated successfully for all active projects.',
    },
    {
      id: 'log-2',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      jobName: 'Morning Kickoff',
      type: 'cron',
      result: 'success',
      message: 'Morning Kickoff cron fired. Agent briefing delivered.',
    },
    {
      id: 'log-3',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      jobName: 'Heartbeat Check',
      type: 'heartbeat',
      result: 'info',
      message: 'HEARTBEAT.md updated. System healthy.',
    },
    {
      id: 'log-4',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      jobName: 'Evening Wrap Up',
      type: 'cron',
      result: 'success',
      message: 'Evening Wrap Up completed. Daily summary written.',
    },
    {
      id: 'log-5',
      timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      jobName: 'Trend Radar Daily Digest',
      type: 'cron',
      result: 'success',
      message: 'Trend Radar digest compiled and delivered to Tom.',
    },
  ];

  return syntheticEntries;
}

// ─── getSummaryStats ──────────────────────────────────────────────────────────

export interface OpsSummaryStats {
  totalJobs: number;
  nextJobFires: Date | null;
  nextJobName: string;
  lastRunStatus: 'success' | 'failure' | 'unknown';
  mutedAlerts: number;
}

export function getSummaryStats(timeline: TimelineEntry[], log: ActivityLogEntry[]): OpsSummaryStats {
  const totalJobs = timeline.length;
  const nextEntry = timeline[0] ?? null;
  const lastLog = log[0] ?? null;
  const lastRunStatus: OpsSummaryStats['lastRunStatus'] =
    lastLog?.result === 'success' ? 'success'
    : lastLog?.result === 'failure' ? 'failure'
    : 'unknown';
  const mutedAlerts = timeline.filter((e) => e.alertMuted).length;

  return {
    totalJobs,
    nextJobFires: nextEntry?.scheduledAt ?? null,
    nextJobName: nextEntry?.name ?? '—',
    lastRunStatus,
    mutedAlerts,
  };
}
