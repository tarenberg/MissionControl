"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Cpu, Database, HardDrive, Zap } from 'lucide-react';

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

interface GaugeProps {
  label: string;
  percentage: number;
  color: string;
  usage: string;
  icon: React.ReactNode;
}

const Gauge: React.FC<GaugeProps> = ({ label, percentage, usage, icon }) => {
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 w-32">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Neomorphic Outer Ring */}
        <div className="absolute inset-0 rounded-full neo-flat" />
        
        {/* Pressed Inner Track */}
        <div className="absolute inset-2 rounded-full neo-pressed" />

        <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[0.85]" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            className="text-gray-300/30"
            strokeWidth="12"
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-blue-500 transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center">
          <div className="text-blue-600 dark:text-blue-400 mb-1">{icon}</div>
          <div className="text-lg font-black text-gray-800 dark:text-gray-200 leading-none">{percentage}%</div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 font-mono bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full shadow-inner">{usage}</div>
      </div>
    </div>
  );
};

export default function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    return (
      <div className="neo-flat rounded-3xl p-6 text-xs text-gray-500 italic flex items-center gap-3 mb-8">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        Synchronizing system metrics...
      </div>
    );
  }

  const formatGB = (bytes: number) => (bytes / (1024 ** 3)).toFixed(1);
  const formatMB = (bytes: number) => (bytes / (1024 ** 2)).toFixed(0);

  const cpuUsage = parseInt(stats.cpu.usage);
  const ramUsage = parseInt(stats.memory.percentage);
  const diskUsage = parseInt(stats.disk.percentage);
  const gpuUsage = stats.gpu.name !== 'N/A' ? Math.round((stats.gpu.used / stats.gpu.total) * 100) : 0;

  return (
    <div className="neo-flat rounded-[40px] overflow-hidden mb-8 transition-all duration-300 ease-in-out border border-white/50 dark:border-white/5 shadow-neo-flat">
      {/* Header Bar */}
      <div 
        className="flex justify-between items-center px-10 py-6 cursor-pointer select-none border-b border-gray-300/30 dark:border-gray-700/30"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-blue-600 dark:text-blue-400">
            <Cpu size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">System Resources</h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Real-time hardware metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 neo-pressed px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
            <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Live</span>
          </div>
          <div className="neo-pressed p-2 rounded-xl text-gray-400 dark:text-gray-600">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
        <div className="px-10 pb-10 pt-8 flex flex-wrap gap-x-12 gap-y-8 justify-around items-start">
          <Gauge
            label="CPU"
            percentage={cpuUsage}
            color="#3b82f6"
            usage={`${stats.cpu.usage}%`}
            icon={<Zap size={14} />}
          />

          <Gauge
            label="RAM"
            percentage={ramUsage}
            color="#3b82f6"
            usage={`${formatGB(stats.memory.used)}/${formatGB(stats.memory.total)} GB`}
            icon={<Database size={14} />}
          />

          <Gauge
            label="Disk"
            percentage={diskUsage}
            color="#3b82f6"
            usage={`${formatGB(stats.disk.used)}/${formatGB(stats.disk.total)} GB`}
            icon={<HardDrive size={14} />}
          />

          {stats.gpu.name !== 'N/A' && (
            <Gauge
              label="GPU"
              percentage={gpuUsage}
              color="#3b82f6"
              usage={`${formatMB(stats.gpu.used)}/${formatMB(stats.gpu.total)} MB`}
              icon={<Cpu size={14} />}
            />
          )}
        </div>
      </div>
    </div>
  );
}
