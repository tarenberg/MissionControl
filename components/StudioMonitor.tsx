"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Thermometer, Droplets, Bell, Video, RefreshCw, ChevronRight } from 'lucide-react';

interface NestEnvironment {
  id: string;
  type: string;
  name: string;
  temperature: number;
  humidity: number;
  mode: string;
  status: string;
  temperatureF?: number;
}

interface NestSensor {
  id: string;
  type: string;
  name: string;
  status: string;
}

export default function StudioMonitor() {
  const [data, setData] = useState<{ environment: NestEnvironment[], sensors: NestSensor[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
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
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every 1m
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="neo-flat rounded-3xl px-6 py-4 flex items-center gap-3 mb-8">
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Syncing Studio Bridge...</span>
    </div>
  );

  const hasData = data && data.environment && Array.isArray(data.environment) && data.environment.length;

  if (!hasData) {
    return (
      <div className="neo-flat rounded-[40px] overflow-hidden mb-8 border border-white/50 dark:border-white/5 shadow-neo-flat opacity-60 grayscale">
        <div className="flex justify-between items-center px-10 py-6">
          <div className="flex items-center gap-4">
            <div className="neo-pressed p-3 rounded-2xl text-gray-400">
              <Thermometer size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-gray-500 dark:text-gray-400 font-black tracking-tighter m-0 uppercase text-sm">Studio Bridge</h2>
              <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Offline or Auth Pending</p>
            </div>
          </div>
          <button onClick={fetchData} className="neo-button no-3d p-2.5 rounded-2xl text-gray-400 hover:text-blue-500 active:neo-button-active">
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    );
  }

  const getTrend = () => {
    if (history.length < 2) return null;
    const latest = history[history.length - 1].temperature;
    const previous = history[history.length - 2].temperature;
    if (latest > previous) return '↑';
    if (latest < previous) return '↓';
    return '→';
  };

  return (
    <div className="neo-flat rounded-[40px] overflow-hidden mb-8 transition-all duration-300 ease-in-out border border-white/50 dark:border-white/5 shadow-neo-flat">
      {/* Header Bar */}
      <div 
        className="flex justify-between items-center px-10 py-6 cursor-pointer select-none border-b border-gray-300/30 dark:border-gray-700/30"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-blue-600 dark:text-blue-400">
            <Thermometer size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Studio Bridge</h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Environment & security sensors</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="neo-pressed p-2 rounded-xl text-gray-400 dark:text-gray-600">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
        <div className="px-10 pb-10 pt-8 flex flex-wrap items-center gap-8">
          {/* Environment Stats */}
          {data.environment.map(env => (
            <React.Fragment key={env.id}>
              <div 
                className="flex items-center gap-4 cursor-pointer hover:bg-white/40 dark:hover:bg-black/20 p-4 rounded-3xl transition-colors neo-flat" 
                title={`${env.name} - ${env.mode}`}
                onClick={() => setShowHistory(!showHistory)}
              >
                <div className="neo-pressed p-2 rounded-xl text-orange-500 dark:text-orange-400">
                  <Thermometer size={16} />
                </div>
                <div>
                  <span className="block font-black text-gray-800 dark:text-gray-200 text-lg leading-none">
                    {env.temperatureF?.toFixed(1) || (env.temperature * 9/5 + 32).toFixed(1)}°F
                  </span>
                  <span className={`text-[10px] font-bold ${getTrend() === '↑' ? 'text-red-500' : getTrend() === '↓' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {getTrend() === '↑' ? 'WARMING' : getTrend() === '↓' ? 'COOLING' : 'STABLE'} {getTrend()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-3xl neo-flat" title="Humidity">
                <div className="neo-pressed p-2 rounded-xl text-blue-500 dark:text-blue-400">
                  <Droplets size={16} />
                </div>
                <div>
                  <span className="block font-black text-gray-800 dark:text-gray-200 text-lg leading-none">{env.humidity}%</span>
                  <span className="block text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Humidity</span>
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Vertical Divider */}
          <div className="h-12 w-[1px] bg-gray-300/50 dark:bg-gray-700/50 hidden md:block"></div>

          {/* Sensors */}
          <div className="flex flex-wrap items-center gap-6">
            {data.sensors.map(sensor => (
              <div key={sensor.id} className="flex items-center gap-3 p-3 rounded-3xl neo-flat" title={sensor.type}>
                <div className="neo-pressed p-2 rounded-xl text-gray-600 dark:text-gray-400">
                  {sensor.type === 'doorbell' ? <Bell size={16} /> : <Video size={16} />}
                </div>
                <div>
                  <span className="block font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight text-[10px]">{sensor.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${sensor.status === 'ONLINE' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                    <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase">{sensor.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-4">
            <button 
              onClick={fetchData}
              className={`neo-button no-3d p-2.5 rounded-2xl text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 active:neo-button-active ${isRefreshing ? 'rotate-180' : ''} transition-all duration-500`}
              title="Refresh Studio Data"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            
            <div className="neo-pressed p-2 rounded-xl text-gray-300 dark:text-gray-600">
               <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* History Popup */}
      {showHistory && history.length > 0 && (
        <div className="absolute top-[80%] left-10 mt-4 neo-flat rounded-[32px] shadow-2xl border border-white dark:border-black/50 p-6 z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-gray-800 dark:text-gray-200 font-bold uppercase tracking-widest text-[10px]">Temperature Trend</h4>
            <button 
              onClick={() => setShowHistory(false)} 
              className="neo-pressed p-1.5 rounded-full text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors no-3d"
            >
              {'\u00D7'}
            </button>
          </div>
          
          <div className="neo-pressed p-4 rounded-2xl mb-4 h-24 flex items-end gap-1">
            {history.slice(-15).map((h, i) => {
              const temperatures = history.slice(-15).map(x => x.temperature);
              const min = Math.min(...temperatures);
              const max = Math.max(...temperatures);
              const range = max - min || 1;
              const height = ((h.temperature - min) / range) * 100;
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500 transition-all duration-300 rounded-t-[2px]" 
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${h.temperature.toFixed(1)}°F at ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                ></div>
              );
            })}
          </div>
          
          <div className="flex justify-between text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
            <span>{new Date(history[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-blue-500 dark:text-blue-400">Active Monitoring</span>
            <span>Now</span>
          </div>
        </div>
      )}
    </div>
  );
}
