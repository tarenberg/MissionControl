"use client";

import React, { useState, useEffect } from 'react';

interface NestEnvironment {
  id: string;
  type: string;
  name: string;
  temperature: number;
  humidity: number;
  mode: string;
  status: string;
}

interface NestSensor {
  id: string;
  type: string;
  name: string;
  status: string;
}

export default function StudioMonitor() {
  const [data, setData] = useState<{ environment: any[], sensors: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/studio/environment');
      const result = await response.json();
      setData(result);
      
      const histRes = await fetch('/api/studio/environment/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch studio environment:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 1m
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="bg-card backdrop-blur-md border border-border-custom rounded-2xl px-5 py-3 text-xs text-muted flex items-center gap-3 mb-6 shadow-sm">
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
      Syncing Studio Bridge...
    </div>
  );

  if (!data || !data.environment.length) return null;

  const getTrend = () => {
    if (history.length < 2) return null;
    const latest = history[history.length - 1].temperature;
    const previous = history[history.length - 2].temperature;
    if (latest > previous) return '↑';
    if (latest < previous) return '↓';
    return '→';
  };

  return (
    <div className="relative group">
      <div className="flex flex-wrap items-center gap-6 bg-card backdrop-blur-xl border border-border-custom rounded-2xl px-6 py-3.5 text-sm text-muted mb-8 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter text-[11px] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">Studio Bridge</span>
        </div>
        
        {data.environment.map(env => (
          <React.Fragment key={env.id}>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 px-2 py-1 rounded-lg transition-colors" 
              title={`${env.name} - ${env.mode}`}
              onClick={() => setShowHistory(!showHistory)}
            >
              <span className="text-lg">🌡️</span>
              <span className="font-bold text-foreground text-base">{env.temperatureF?.toFixed(1) || (env.temperature * 9/5 + 32).toFixed(1)}°F</span>
              <span className={`text-xs font-bold ${getTrend() === '↑' ? 'text-red-500' : getTrend() === '↓' ? 'text-blue-500' : 'text-muted'}`}>
                {getTrend()}
              </span>
            </div>
            
            <div className="flex items-center gap-2" title="Humidity">
              <span className="text-lg">💧</span>
              <span className="font-bold text-foreground text-base">{env.humidity}%</span>
            </div>
          </React.Fragment>
        ))}

        <span className="w-[1px] h-4 bg-border-custom"></span>

        {data.sensors.map(sensor => (
          <div key={sensor.id} className="flex items-center gap-2" title={sensor.type}>
            <span className="text-lg">{sensor.type === 'doorbell' ? '🔔' : '📹'}</span>
            <span className="font-bold text-foreground uppercase tracking-tight text-[10px]">{sensor.name}</span>
            <span className={`flex h-1.5 w-1.5 rounded-full ${sensor.status === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest animate-pulse">Live</span>
          <button 
            onClick={fetchData}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-muted hover:text-blue-600 dark:hover:text-blue-400"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="absolute top-full left-0 mt-2 bg-card rounded-2xl shadow-2xl border border-border-custom p-5 z-50 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-foreground uppercase tracking-widest">Temperature Trend</h4>
            <button onClick={() => setShowHistory(false)} className="text-muted hover:text-foreground no-3d">×</button>
          </div>
          <div className="flex items-end gap-1 h-20 mb-4">
            {history.slice(-15).map((h, i) => {
              const min = Math.min(...history.slice(-15).map(x => x.temperature));
              const max = Math.max(...history.slice(-15).map(x => x.temperature));
              const range = max - min || 1;
              const height = ((h.temperature - min) / range) * 100;
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors rounded-t-sm" 
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${h.temperature.toFixed(1)}°F at ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                ></div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-muted uppercase">
            <span>{new Date(history[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Now</span>
          </div>
        </div>
      )}
    </div>
  );
}
