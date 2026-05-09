"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Activity, ShieldCheck, Zap, Server, Cpu } from 'lucide-react';

interface PulseData {
  timestamp: string;
  services: {
    [key: string]: {
      name: string;
      port: number;
      status: 'online' | 'offline' | 'unknown';
    };
  };
  agents: { id: string; name: string; status: string }[];
  nest?: {
    status: 'connected' | 'disconnected';
    temp?: number;
    humidity?: number;
  };
}

export default function OpsPulse() {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPulse = async () => {
    try {
      const res = await fetch('/api/system/pulse');
      if (!res.ok) throw new Error('Pulse endpoint returned error');
      const data = await res.json();
      setPulse(data);
      setError(null);
    } catch (e: any) {
      console.error('Pulse check failed', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="neo-flat rounded-3xl p-6 mb-12 flex items-center gap-4 animate-pulse">
      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
      <div className="h-4 w-32 bg-gray-200 rounded-lg"></div>
    </div>
  );

  if (error || !pulse) return (
    <div className="neo-flat rounded-[40px] overflow-hidden mb-12 border border-white/50 dark:border-white/5 shadow-neo-flat opacity-60 grayscale">
      <div className="flex justify-between items-center px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-red-400">
            <Activity size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-gray-500 dark:text-gray-400 font-black tracking-tighter m-0 uppercase text-sm">Live Operations Pulse</h2>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Pulse check failing: {error || 'No data'}</p>
          </div>
        </div>
        <button onClick={fetchPulse} className="neo-button no-3d p-2.5 rounded-2xl text-gray-400 hover:text-blue-500 active:neo-button-active">
          <Activity size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="neo-flat rounded-[40px] overflow-hidden transition-all duration-300 ease-in-out border border-white/50 dark:border-white/5 shadow-neo-flat">
      {/* Header Bar */}
      <div 
        className="flex justify-between items-center px-10 py-6 cursor-pointer select-none border-b border-gray-300/30 dark:border-gray-700/30"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-green-600 dark:text-green-400">
            <Activity size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Live Operations Pulse</h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">System health & connectivity</p>
          </div>
        </div>

        <div className="neo-pressed p-2 rounded-xl text-gray-400 dark:text-gray-600">
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'}`}>
        <div className="px-10 pb-10 pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Gateway Pulse */}
          <div className="neo-flat rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1 h-full ${pulse.services.gateway.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="neo-pressed p-2 rounded-xl text-blue-500">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 truncate">Gateway</p>
              <p className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tighter truncate">
                {pulse.services.gateway.status === 'online' ? 'READY' : 'FAULT'}
              </p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 truncate">Port {pulse.services.gateway.port}</p>
            </div>
          </div>

          {/* MC Pulse */}
          <div className="neo-flat rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-1 h-full ${pulse.services.missionControl.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="neo-pressed p-2 rounded-xl text-purple-500">
              <Server size={16} />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 truncate">MC Server</p>
              <p className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tighter truncate">
                 {pulse.services.missionControl.status === 'online' ? 'ACTIVE' : 'IDLE'}
              </p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 truncate">Direct Link</p>
            </div>
          </div>

          {/* Art Tracker Pulse */}
          <div className="neo-flat rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1 h-full ${pulse.services.artTracker?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="neo-pressed p-2 rounded-xl text-orange-600">
              <Activity size={16} />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 truncate">Art Tracker</p>
              <p className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tighter truncate">
                {pulse.services.artTracker?.status === 'online' ? 'ONLINE' : 'OFFLINE'}
              </p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 truncate">Port 8080</p>
            </div>
          </div>

          {/* Agent Pulse */}
          <div className="neo-flat rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
            <div className="neo-pressed p-2 rounded-xl text-orange-500">
              <Cpu size={16} />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 truncate">Agents</p>
              <p className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tighter truncate">
                {pulse.agents.length} STANDBY
              </p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 truncate">Jason • Pixels</p>
            </div>
          </div>

          {/* Last Update */}
          <div className="neo-flat rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden">
            <div className="neo-pressed p-2 rounded-xl text-green-500">
              <Activity size={16} />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 truncate">Heartbeat</p>
              <p className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tighter truncate">
                {new Date(pulse.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[8px] font-bold text-green-600 uppercase mt-0.5 animate-pulse truncate">Syncing</p>
            </div>
          </div>

          {/* Nest Studio Bridge */}
          <div className="neo-flat rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1 h-full ${pulse.nest?.status === 'connected' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <div className={`neo-pressed p-2 rounded-xl ${pulse.nest?.status === 'connected' ? 'text-cyan-500' : 'text-gray-400'}`}>
              <Zap size={16} />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 truncate">Studio</p>
              <p className="text-base font-black text-gray-800 dark:text-gray-100 tracking-tighter truncate">
                {pulse.nest?.status === 'connected' ? `${pulse.nest.temp}°F` : 'LOCKED'}
              </p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 truncate">
                {pulse.nest?.status === 'connected' ? `${pulse.nest.humidity}% Hum` : 'Auth Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
