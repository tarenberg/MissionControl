'use client';

import React, { useState, useTransition } from 'react';
import OpsSummaryBar from '@/components/OpsSummaryBar';
import OpsTimeline from '@/components/OpsTimeline';
import OpsDetailPanel from '@/components/OpsDetailPanel';
import OpsActivityLog from '@/components/OpsActivityLog';
import type { OpsControlData } from '@/app/ops/actions';

// All Date fields are serialized to ISO strings when crossing the server→client boundary.
// This mapped type mirrors that transformation so prop types align correctly.
type StringifyDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K] extends Array<infer U>
    ? StringifyDates<U>[]
    : T[K] extends object
    ? StringifyDates<T[K]>
    : T[K];
};

type SerializedData = StringifyDates<OpsControlData>;

interface Props {
  data: OpsControlData;
  onRefresh: () => Promise<OpsControlData>;
}

export default function OpsControlClient({ data: initialData, onRefresh }: Props) {
  // Cast once at the boundary — dates are already strings after JSON serialization
  const [data, setData] = useState<SerializedData>(initialData as unknown as SerializedData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedEntry = data.timeline.find((e) => e.id === selectedId) ?? null;

  function handleRefresh() {
    startTransition(async () => {
      const fresh = await onRefresh();
      setData(fresh as unknown as SerializedData);
    });
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ops Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Background operations, scheduled jobs &amp; active processes
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-900 text-sm px-4 py-2 rounded-lg transition-colors border border-gray-200"
        >
          <span className={isPending ? 'animate-spin' : ''}>↻</span>
          {isPending ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error banners */}
      {data.cronError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-2 rounded-lg">
          <strong>openclaw cron list failed:</strong> {data.cronError}
        </div>
      )}
      {data.externalError && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded-lg">
          <strong>Windows Task Scheduler query failed:</strong> {data.externalError}
        </div>
      )}
      {data.heartbeat.status === 'not-configured' && (
        <div className="mb-4 bg-gray-100 border border-gray-200 text-gray-500 text-sm px-4 py-2 rounded-lg">
          <strong>Heartbeat:</strong> HEARTBEAT.md not found — heartbeat automation is not configured.
        </div>
      )}
      {data.heartbeat.status === 'stale' && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded-lg">
          <strong>Heartbeat stale:</strong> HEARTBEAT.md has not been updated in over 30 minutes.
        </div>
      )}

      {/* Summary bar */}
      <OpsSummaryBar summary={data.summary} fetchedAt={data.fetchedAt} />

      {/* Two-column main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 mb-4" style={{ minHeight: '520px' }}>
        {/* Left: Timeline */}
        <OpsTimeline
          entries={data.timeline}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Right: Detail panel */}
        <OpsDetailPanel
          selectedEntry={selectedEntry}
          activeProcesses={data.activeProcesses}
          cronJobs={data.cronJobs}
          cronError={data.cronError}
          heartbeat={data.heartbeat}
          internalSchedulers={data.internalSchedulers}
          externalSchedulers={data.externalSchedulers}
          externalError={data.externalError}
          resourceMonitors={data.resourceMonitors}
          agentModels={data.agentModels}
        />
      </div>

      {/* Bottom: Activity log strip */}
      <OpsActivityLog entries={data.activityLog} />
    </div>
  );
}
