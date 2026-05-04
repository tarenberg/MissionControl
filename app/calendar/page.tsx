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

const getCategoryColor = (name: string, description: string): { bg: string; border: string; text: string } => {
  const combined = `${name} ${description || ''}`.toLowerCase();
  
  if (combined.includes('heartbeat') || combined.includes('monitor')) {
    return { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' };
  }
  if (combined.includes('memory') || combined.includes('learning')) {
    return { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900' };
  }
  if (combined.includes('digest') || combined.includes('content')) {
    return { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900' };
  }
  if (combined.includes('watchdog') || combined.includes('infrastructure')) {
    return { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-900' };
  }
  return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-900' };
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
    <div className="h-screen flex flex-col bg-white">
      <div className="border-b border-gray-200 p-4">
        <h1>Scheduled Jobs</h1>
        <p className="text-sm text-gray-600 mt-1">Weekly calendar view (UTC)</p>
      </div>

      {/* High-frequency jobs banner */}
      {highFrequencyJobs.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">High-frequency Jobs</p>
          <div className="flex flex-wrap gap-2">
            {highFrequencyJobs.map((cj) => {
              const colors = getCategoryColor(cj.job.name, cj.job.description || '');
              return (
                <div
                  key={cj.job.id}
                  className={`px-3 py-2 rounded-full text-sm font-medium ${colors.bg} ${colors.text} border border-current cursor-help`}
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
                  Every {cj.firePattern.frequencyMinutes}m — {formatJobName(cj.job.name, 30)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto relative">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="flex">
            <div className="w-16 flex-shrink-0 bg-gray-50 border-r border-gray-200"></div>
            {dayNames.map((day, i) => (
              <div
                key={i}
                className="flex-1 min-w-0 text-center py-3 font-semibold text-sm text-gray-900 border-r border-gray-200 bg-gray-50"
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* Hour labels */}
          <div className="sticky left-0 z-10 w-16 flex-shrink-0 bg-gray-50 border-r border-gray-200">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-24 flex items-start justify-center pt-1 text-xs text-gray-600 font-medium border-b border-gray-200 bg-gray-50"
              >
                {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="flex flex-1">
            {dayNames.map((_, dayOfWeek) => (
              <div key={dayOfWeek} className="flex-1 min-w-0 border-r border-gray-200 bg-white">
                {hours.map((hour) => {
                  const cellJobs = grid[hour][dayOfWeek];
                  return (
                    <div
                      key={`${dayOfWeek}-${hour}`}
                      className="h-24 border-b border-gray-200 p-1 bg-white hover:bg-gray-50 overflow-hidden relative"
                    >
                      <div className="flex flex-col gap-0.5">
                        {cellJobs.slice(0, 3).map((cj) => {
                          const colors = getCategoryColor(cj.job.name, cj.job.description || '');
                          return (
                            <div
                              key={cj.job.id}
                              className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text} truncate cursor-help border border-current`}
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
                              {formatJobName(cj.job.name)}
                            </div>
                          );
                        })}
                        {cellJobs.length > 3 && (
                          <div className="text-xs text-gray-500 px-1">
                            +{cellJobs.length - 3} more
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
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Unscheduled Jobs</p>
          <div className="space-y-2">
            {unscheduledJobs.map((job) => {
              const colors = getCategoryColor(job.name, job.description || '');
              return (
                <div
                  key={job.id}
                  className={`p-3 rounded-lg border ${colors.border} ${colors.bg} ${
                    !job.enabled ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-semibold text-sm ${colors.text} ${!job.enabled ? 'line-through' : ''}`}>
                        {job.name}
                      </h4>
                      {job.description && (
                        <p className="text-xs text-gray-600 mt-1">{job.description}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        !job.enabled
                          ? 'bg-gray-300 text-gray-700'
                          : job.state.lastRunStatus === 'ok'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {!job.enabled ? 'Disabled' : job.state.lastRunStatus === 'ok' ? '✓ OK' : '✗ Error'}
                    </span>
                  </div>
                  {job.state.consecutiveErrors > 0 && (
                    <p className="text-xs text-red-600 mt-2">
                      Consecutive Errors: {job.state.consecutiveErrors}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scheduledJobs.length === 0 && highFrequencyJobs.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>No scheduled jobs found</p>
        </div>
      )}
    </div>
  );
}
