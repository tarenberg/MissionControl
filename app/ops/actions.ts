'use server';

import {
  getCronJobs,
  getHeartbeatInfo,
  getInternalSchedulers,
  getActiveProcesses,
  getExternalSchedulers,
  getResourceMonitors,
  getTimeline,
  getActivityLog,
  getSummaryStats,
  getAgentModels,
  type CronJobItem,
  type HeartbeatInfo,
  type InternalScheduler,
  type ActiveProcess,
  type ExternalScheduler,
  type ResourceMonitor,
  type TimelineEntry,
  type ActivityLogEntry,
  type OpsSummaryStats,
  type AgentModelItem,
} from '@/lib/opsControlData';

export interface OpsControlData {
  cronJobs: CronJobItem[];
  cronError?: string;
  heartbeat: HeartbeatInfo;
  internalSchedulers: InternalScheduler[];
  activeProcesses: ActiveProcess[];
  externalSchedulers: ExternalScheduler[];
  externalError?: string;
  resourceMonitors: ResourceMonitor[];
  timeline: TimelineEntry[];
  activityLog: ActivityLogEntry[];
  summary: OpsSummaryStats;
  agentModels: AgentModelItem[];
  fetchedAt: string; // ISO string (safe for client serialization)
}

// Serialize Dates to ISO strings for safe client transfer
function serializeDates<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      value instanceof Date ? value.toISOString() : value,
    ),
  ) as T;
}

export async function getOpsControlData(): Promise<OpsControlData> {
  const cronResult = getCronJobs();
  const heartbeat = getHeartbeatInfo();
  const internalSchedulers = getInternalSchedulers();
  const activeProcesses = getActiveProcesses();
  const externalResult = getExternalSchedulers();
  const resourceMonitors = getResourceMonitors();
  const timeline = getTimeline();
  const activityLog = getActivityLog();
  const summary = getSummaryStats(timeline, activityLog);
  const agentModels = getAgentModels();

  const data: OpsControlData = {
    cronJobs: cronResult.jobs,
    cronError: cronResult.error,
    heartbeat,
    internalSchedulers,
    activeProcesses,
    externalSchedulers: externalResult.schedulers,
    externalError: externalResult.error,
    resourceMonitors,
    timeline,
    activityLog,
    summary,
    agentModels,
    fetchedAt: new Date().toISOString(),
  };

  return serializeDates(data);
}
