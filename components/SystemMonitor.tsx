"use client";

import React, { useState, useEffect } from 'react';

interface SystemStats {
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: string;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: string;
  };
  cpu: {
    usage: string;
  };
  gpu: {
    name: string;
    total: number;
    used: number;
    free: number;
  };
}

interface CircularGaugeProps {
  label: string;
  percentage: number;
  color: string;
  usage: string;
  details?: string;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ label, percentage, color, usage, details }) => {
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            className="text-gray-100 dark:text-zinc-800"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-black text-foreground leading-none">{percentage}%</div>
          <div className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">{label}</div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-muted">{usage}</div>
      </div>
    </div>
  );
};

export default function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system-status');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch system stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div className="bg-card rounded-2xl py-4 text-xs text-muted">Loading system metrics...</div>;
  }

  const formatGB = (bytes: number) => (bytes / (1024 ** 3)).toFixed(1);
  const formatMB = (bytes: number) => (bytes / (1024 ** 2)).toFixed(0);

  const cpuUsage = parseInt(stats.cpu.usage);
  const ramUsage = parseInt(stats.memory.percentage);
  const diskUsage = parseInt(stats.disk.percentage);
  const gpuUsage = stats.gpu.name !== 'N/A' ? Math.round((stats.gpu.used / stats.gpu.total) * 100) : 0;

  return (
    <div className="w-full mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-foreground tracking-tight uppercase tracking-widest">System</h2>
        <div className="flex items-center gap-1.5 bg-card px-2 py-0.5 rounded-full border border-border-custom">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[9px] font-black text-muted uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Gauge Row */}
      <div className="flex flex-wrap gap-10 items-start">
        {/* CPU */}
        <CircularGauge
          label="CPU"
          percentage={cpuUsage}
          color="#3b82f6"
          usage={`${stats.cpu.usage}%`}
        />

        {/* RAM */}
        <CircularGauge
          label="RAM"
          percentage={ramUsage}
          color="#ef4444"
          usage={`${formatGB(stats.memory.used)}/${formatGB(stats.memory.total)} GB`}
        />

        {/* Disk */}
        <CircularGauge
          label="Disk"
          percentage={diskUsage}
          color="#f59e0b"
          usage={`${formatGB(stats.disk.used)}/${formatGB(stats.disk.total)} GB`}
        />

        {/* GPU */}
        {stats.gpu.name !== 'N/A' && (
          <CircularGauge
            label="GPU"
            percentage={gpuUsage}
            color="#8b5cf6"
            usage={`${formatMB(stats.gpu.used)}/${formatMB(stats.gpu.total)} MB`}
          />
        )}
      </div>
    </div>
  );
}
