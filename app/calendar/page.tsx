"use client";

import React, { useState, useEffect } from 'react';

interface CronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr?: string;
    at?: string;
  };
  state: {
    lastRunStatus: string;
    lastRunAtMs?: number;
    nextRunAtMs?: number;
    lastDurationMs?: number;
    consecutiveErrors: number;
  };
  payload?: {
    model?: string;
  };
}

interface CronSchedule {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

interface CalendarJob {
  job: CronJob;
  firePattern: {
    dayOfWeek: number[]; // 0-6 (0 = Sunday)
    hours: number[];     // 0-23
    isHighFrequency?: boolean;
    frequencyMinutes?: number;
  };
}

const getCategoryColor = (name: string, description: string): { bg: string; text: string; glow: string } => {
  const combined = `${name} ${description || ''}`.toLowerCase();
  
  if (combined.includes('heartbeat') || combined.includes('monitor')) {
    return { 
      bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-600/30', 
      text: 'text-blue-700 dark:text-blue-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(59,130,246,0.5)]' 
    };
  }
  if (combined.includes('nightly') || combined.includes('sprint') || combined.includes('deep-work')) {
    return { 
      bg: 'bg-gradient-to-br from-indigo-500/20 to-blue-700/30', 
      text: 'text-indigo-700 dark:text-indigo-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(79,70,229,0.5)]' 
    };
  }
  if (combined.includes('kickoff') || combined.includes('morning') || combined.includes('start') || combined.includes('wrap-up') || combined.includes('evening') || combined.includes('end-of-day')) {
    return { 
      bg: 'bg-gradient-to-br from-sky-400/20 to-blue-500/30', 
      text: 'text-sky-700 dark:text-sky-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(56,189,248,0.5)]' 
    };
  }
  if (combined.includes('snapshot') || combined.includes('backup') || combined.includes('state')) {
    return { 
      bg: 'bg-gradient-to-br from-teal-400/20 to-cyan-600/30', 
      text: 'text-teal-700 dark:text-teal-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(20,184,166,0.5)]' 
    };
  }
  if (combined.includes('warning') || combined.includes('alert') || combined.includes('critical')) {
    return { 
      bg: 'bg-gradient-to-br from-red-500/20 to-orange-600/30', 
      text: 'text-red-700 dark:text-red-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(239,68,68,0.6)]' 
    };
  }
  if (combined.includes('memory') || combined.includes('learning') || combined.includes('history')) {
    return { 
      bg: 'bg-gradient-to-br from-purple-500/20 to-pink-600/30', 
      text: 'text-purple-700 dark:text-purple-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(168,85,247,0.5)]' 
    };
  }
  if (combined.includes('summary') || combined.includes('distill') || combined.includes('consolidation')) {
    return { 
      bg: 'bg-gradient-to-br from-indigo-400/20 to-purple-600/30', 
      text: 'text-indigo-700 dark:text-indigo-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(129,140,248,0.5)]' 
    };
  }
  if (combined.includes('digest') || combined.includes('content') || combined.includes('report') || combined.includes('summary')) {
    return { 
      bg: 'bg-gradient-to-br from-amber-400/20 to-orange-600/30', 
      text: 'text-amber-700 dark:text-amber-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(245,158,11,0.5)]' 
    };
  }
  if (combined.includes('watchdog') || combined.includes('infrastructure') || combined.includes('system') || combined.includes('server')) {
    return { 
      bg: 'bg-gradient-to-br from-emerald-400/20 to-teal-600/30', 
      text: 'text-emerald-700 dark:text-emerald-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(16,185,129,0.5)]' 
    };
  }
  if (combined.includes('sync') || combined.includes('fetch') || combined.includes('pull')) {
    return { 
      bg: 'bg-gradient-to-br from-cyan-400/20 to-blue-600/30', 
      text: 'text-cyan-700 dark:text-cyan-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(34,211,238,0.5)]' 
    };
  }
  if (combined.includes('cleanup') || combined.includes('prune') || combined.includes('delete')) {
    return { 
      bg: 'bg-gradient-to-br from-rose-400/20 to-red-600/30', 
      text: 'text-rose-700 dark:text-rose-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(244,63,94,0.5)]' 
    };
  }
  if (combined.includes('ai') || combined.includes('llm') || combined.includes('agent') || combined.includes('gpt') || combined.includes('muffin')) {
    return { 
      bg: 'bg-gradient-to-br from-violet-500/20 to-fuchsia-600/30', 
      text: 'text-violet-700 dark:text-violet-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(139,92,246,0.5)]' 
    };
  }
  if (combined.includes('art') || combined.includes('design') || combined.includes('style') || combined.includes('deadline')) {
    return { 
      bg: 'bg-gradient-to-br from-pink-400/20 to-rose-600/30', 
      text: 'text-pink-700 dark:text-pink-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(236,72,153,0.5)]' 
    };
  }
  if (combined.includes('security') || combined.includes('audit') || combined.includes('health')) {
    return { 
      bg: 'bg-gradient-to-br from-lime-400/20 to-green-600/30', 
      text: 'text-lime-700 dark:text-lime-300', 
      glow: 'shadow-[0_0_20px_-2px_rgba(132,204,22,0.5)]' 
    };
  }
  return { 
    bg: 'bg-gradient-to-br from-gray-400/20 to-gray-600/30', 
    text: 'text-gray-700 dark:text-gray-300', 
    glow: '' 
  };
};

const parseCronExpression = (expr: string): CronSchedule | null => {
  const fields = expr.trim().split(/\s+/);
  
  // Handle @yearly, @monthly, @weekly, @daily, @hourly, @reboot
  if (expr.startsWith('@')) {
    return null;
  }
  
  if (fields.length !== 5) {
    return null;
  }
  
  const parseField = (field: string, min: number, max: number): number[] => {
    if (field === '*') {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }
    
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = parseInt(step, 10);
      let start = min;
      let end = max;
      
      if (range !== '*') {
        const parts = range.split('-');
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : max;
      }
      
      const result = [];
      for (let i = start; i <= end; i += stepNum) {
        result.push(i);
      }
      return result;
    }
    
    if (field.includes(',')) {
      return field.split(',').flatMap(part => parseField(part, min, max));
    }
    
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(s => parseInt(s, 10));
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    
    const num = parseInt(field, 10);
    if (isNaN(num)) return [];
    return [num];
  };
  
  const minutes = parseField(fields[0], 0, 59);
  const hours = parseField(fields[1], 0, 23);
  const dayOfMonth = parseField(fields[2], 1, 31);
  const months = parseField(fields[3], 1, 12);
  const dayOfWeek = parseField(fields[4], 0, 6);
  
  return {
    minute: minutes,
    hour: hours,
    dayOfMonth,
    month: months,
    dayOfWeek,
  };
};

const analyzeJobSchedule = (job: CronJob): CalendarJob['firePattern'] => {
  if (job.schedule.kind !== 'cron' || !job.schedule.expr) {
    return {
      dayOfWeek: [],
      hours: [],
    };
  }
  
  const cron = parseCronExpression(job.schedule.expr);
  if (!cron) {
    return {
      dayOfWeek: [],
      hours: [],
    };
  }
  
  // Check for high-frequency jobs (< 1 hour interval)
  const uniqueMinutes = new Set(cron.minute);
  const isHighFrequency = uniqueMinutes.size > 1 && uniqueMinutes.size <= 12;
  
  let frequencyMinutes: number | undefined;
  if (isHighFrequency) {
    const sorted = Array.from(uniqueMinutes).sort((a, b) => a - b);
    if (sorted.length > 1) {
      frequencyMinutes = sorted[1] - sorted[0];
      // Verify it's consistent
      for (let i = 2; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] !== frequencyMinutes) {
          frequencyMinutes = undefined;
          break;
        }
      }
    }
  }
  
  // Determine which days of week (0-6) this job runs
  let daysOfWeek = cron.dayOfWeek;
  if (daysOfWeek.length === 0 || daysOfWeek.length === 7) {
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Every day
  }
  
  return {
    dayOfWeek: daysOfWeek,
    hours: cron.hour,
    isHighFrequency,
    frequencyMinutes,
  };
};

const formatJobName = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 3) + '...';
};

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/cron-jobs');
        if (response.ok) {
          setJobs(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch cron jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allHours = Array.from({ length: 24 }, (_, i) => i);

  // Analyze all jobs
  const calendarJobs: CalendarJob[] = jobs
    .filter(job => job.enabled)
    .map(job => ({
      job,
      firePattern: analyzeJobSchedule(job),
    }));

  const highFrequencyJobs = calendarJobs.filter(cj => cj.firePattern.isHighFrequency);
  const scheduledJobs = calendarJobs.filter(cj => !cj.firePattern.isHighFrequency && cj.firePattern.hours.length > 0);
  const unscheduledJobs = jobs.filter(job => !job.enabled || !job.schedule.expr);

  // Build calendar grid: grid[hour][dayOfWeek] = jobs array
  const grid: CalendarJob[][][] = Array.from({ length: 24 }, () =>
    Array.from({ length: 7 }, () => [])
  );

  for (const cj of scheduledJobs) {
    for (const dayOfWeek of cj.firePattern.dayOfWeek) {
      for (const hour of cj.firePattern.hours) {
        grid[hour][dayOfWeek].push(cj);
      }
    }
  }

  // Only show hours that have at least one job
  const hours = allHours.filter(h => grid[h].some(col => col.length > 0));

  return (
    <div className="h-full flex flex-col -mt-4 bg-neo-bg p-8 transition-colors duration-300">
      <div className="flex justify-between items-center mb-12 flex-shrink-0">
        <div>
          <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-4xl mb-2 drop-shadow-sm uppercase">Scheduled Jobs</h1>
          <div className="flex items-center gap-3">
             <div className="neo-pressed px-4 py-1.5 rounded-full">
                <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest m-0">Weekly calendar view (UTC)</p>
             </div>
          </div>
        </div>
      </div>

      {/* High-frequency jobs banner */}
      {highFrequencyJobs.length > 0 && (
        <div className="neo-flat rounded-[40px] p-6 mb-8 border border-white/50 dark:border-white/5">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-[0.2em] ml-2">High-frequency Mission Pulses</p>
          <div className="flex flex-wrap gap-4">
            {highFrequencyJobs.map((cj) => {
              const colors = getCategoryColor(cj.job.name, cj.job.description || '');
              return (
                <div
                  key={cj.job.id}
                  className={`neo-button no-3d px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 active:neo-button-active border border-current ${colors.bg} ${colors.text} ${colors.glow}`}
                  title={`Runs every ${cj.firePattern.frequencyMinutes}m\nLast run: ${
                    cj.job.state.lastRunAtMs
                      ? new Date(cj.job.state.lastRunAtMs).toLocaleString()
                      : 'Never'
                  }\nNext run: ${
                    cj.job.state.nextRunAtMs
                      ? new Date(cj.job.state.nextRunAtMs).toLocaleString()
                      : 'N/A'
                  }${cj.job.payload?.model ? `\nModel: ${cj.job.payload.model}` : ''}`}
                >
                  <span className="opacity-50">EVERY {cj.firePattern.frequencyMinutes}M</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  {formatJobName(cj.job.name, 30)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 mb-8 neo-flat rounded-[40px] border border-white/50 dark:border-white/5 overflow-hidden flex flex-col shadow-neo-flat">
        <div className="flex bg-white/20 dark:bg-black/10 backdrop-blur-md border-b border-gray-300/30 dark:border-gray-700/30 sticky top-0 z-20">
          <div className="w-20 flex-shrink-0 border-r border-gray-300/30 dark:border-gray-700/30"></div>
          {dayNames.map((day, i) => (
            <div
              key={i}
              className="flex-1 min-w-0 text-center py-5 font-black text-[11px] uppercase tracking-[0.3em] text-gray-800 dark:text-gray-200 border-r border-gray-300/30 dark:border-gray-700/30"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Hour labels */}
          <div className="w-20 flex-shrink-0 border-r border-gray-300/30 dark:border-gray-700/30 bg-white/5 dark:bg-black/5">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-20 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest border-b border-gray-300/30 dark:border-gray-700/30"
              >
                {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="flex flex-1">
            {dayNames.map((_, dayOfWeek) => (
              <div key={dayOfWeek} className="flex-1 min-w-0 border-r border-gray-300/30 dark:border-gray-700/30">
                {hours.map((hour) => {
                  const cellJobs = grid[hour][dayOfWeek];
                  return (
                    <div
                      key={`${dayOfWeek}-${hour}`}
                      className="h-20 border-b border-gray-300/30 dark:border-gray-700/30 p-2 hover:bg-white/10 dark:hover:bg-black/10 transition-colors overflow-hidden group"
                    >
                      <div className="flex flex-col gap-2">
                        {cellJobs.slice(0, 3).map((cj) => {
                          const colors = getCategoryColor(cj.job.name, cj.job.description || '');
                          return (
                            <div
                              key={cj.job.id}
                              className={`neo-button no-3d px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest truncate cursor-help border border-current active:neo-button-active ${colors.bg} ${colors.text} ${colors.glow}`}
                              title={`${cj.job.name}${cj.job.description ? `\n${cj.job.description}` : ''}
Last run: ${
                                cj.job.state.lastRunAtMs
                                  ? new Date(cj.job.state.lastRunAtMs).toLocaleString()
                                  : 'Never'
                              }
Next run: ${
                                cj.job.state.nextRunAtMs
                                  ? new Date(cj.job.state.nextRunAtMs).toLocaleString()
                                  : 'N/A'
                              }${cj.job.payload?.model ? `\nModel: ${cj.job.payload.model}` : ''}
Status: ${cj.job.state.lastRunStatus}`}
                            >
                              {formatJobName(cj.job.name, 15)}
                            </div>
                          );
                        })}
                        {cellJobs.length > 3 && (
                          <div className="text-[8px] font-black text-gray-400 dark:text-gray-500 px-1 uppercase tracking-widest text-center mt-1">
                            +{cellJobs.length - 3} MORE
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unscheduled jobs section */}
      {unscheduledJobs.length > 0 && (
        <div className="neo-flat rounded-[40px] p-8 border border-white/50 dark:border-white/5">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-[0.2em] ml-2">Unscheduled Sub-routines</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unscheduledJobs.map((job) => {
              const colors = getCategoryColor(job.name, job.description || '');
              return (
                <div
                  key={job.id}
                  className={`neo-button no-3d p-6 rounded-[32px] border border-white/20 dark:border-white/5 flex flex-col group active:neo-button-active transition-all ${
                    !job.enabled ? 'opacity-40 grayscale' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className={`font-black text-xs uppercase tracking-widest ${colors.text}`}>
                        {job.name}
                      </h4>
                      {job.description && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium leading-relaxed line-clamp-2">{job.description}</p>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full neo-pressed ${
                        !job.enabled
                          ? 'text-gray-400 dark:text-gray-600'
                          : job.state.lastRunStatus === 'ok'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {!job.enabled ? 'Disabled' : job.state.lastRunStatus === 'ok' ? '✓ OK' : '✗ Error'}
                    </span>
                  </div>
                  {job.state.consecutiveErrors > 0 && (
                    <div className="mt-auto pt-4 border-t border-gray-300/30 dark:border-gray-700/30">
                       <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                        Consecutive Errors: {job.state.consecutiveErrors}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scheduledJobs.length === 0 && highFrequencyJobs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center neo-flat rounded-[40px] opacity-30 italic">
          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No scheduled pulses found</p>
        </div>
      )}
    </div>
  );
}
