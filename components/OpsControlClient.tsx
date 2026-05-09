'use client';

import React, { useState, useTransition } from 'react';
import OpsSummaryBar from '@/components/OpsSummaryBar';
import OpsPulse from '@/components/OpsPulse';
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
    <div className="p-12 bg-neo-bg min-h-screen transition-colors duration-300">
      {/* Page header */}
      <div className="flex items-center justify-between mb-16 ml-4">
        <div>
          <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-5xl mb-3 drop-shadow-sm uppercase">Ops Control</h1>
          <div className="flex items-center gap-3">
             <div className="neo-pressed px-6 py-2 rounded-full">
               <p className="text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] m-0">Mission Telemetry & Scheduling</p>
             </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="neo-button rounded-2xl px-8 py-4 flex items-center gap-3 border border-white/20 dark:border-white/5 group"
        >
          <span className={`text-lg transition-transform duration-700 ${isPending ? 'animate-spin' : 'group-hover:rotate-180'}`}>↻</span>
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">{isPending ? 'Syncing...' : 'Sync Data'}</span>
        </button>
      </div>

      {/* Error banners */}
      <div className="px-4 space-y-4 mb-12">
        {data.cronError && (
          <div className="neo-flat border-l-4 border-red-500 bg-red-500/5 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">CRON SUBSYSTEM FAULT</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{data.cronError}</p>
            </div>
          </div>
        )}
        {data.externalError && (
          <div className="neo-flat border-l-4 border-orange-500 bg-orange-500/5 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <span className="text-2xl">🌐</span>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">EXTERNAL SCHEDULER TIMEOUT</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{data.externalError}</p>
            </div>
          </div>
        )}
        {data.heartbeat.status === 'stale' && (
          <div className="neo-flat border-l-4 border-yellow-500 bg-yellow-500/5 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <span className="text-2xl">💓</span>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400 mb-1">HEARTBEAT LATENCY WARNING</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">HEARTBEAT.md has not been updated in over 30 minutes. Automation sync may be lagging.</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="px-4">
        <OpsSummaryBar summary={data.summary} fetchedAt={data.fetchedAt} />
      </div>

      {/* Pulse Status */}
      <OpsPulse />

      {/* Two-column main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-10 mb-12 px-4 h-[700px]">
        {/* Left: Timeline */}
        <div className="h-full">
          <OpsTimeline
            entries={data.timeline}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right: Detail panel */}
        <div className="h-full">
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
      </div>

      {/* Bottom: Activity log strip */}
      <div className="px-4 pb-20">
        <OpsActivityLog entries={data.activityLog} />
      </div>
    </div>
  );
}
