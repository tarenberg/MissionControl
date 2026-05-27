"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Shield, HelpCircle, Activity } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline';
  description: string;
}

export default function ServicesMonitor() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/system-services', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`system-services ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data.services)) {
        setServices(data.services);
        setFetchError(null);
      }
    } catch (error) {
      console.error('Failed to fetch services status:', error);
      setFetchError('Services health metrics offline');
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async (id: string) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch('/api/system-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', service: id })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to restart: ${response.status}`);
      }

      // If restarting the Next.js server itself, we wait longer and let the user know
      if (id === 'next_dev') {
        setTimeout(() => {
          // Force page reload after Next.js starts back up
          window.location.reload();
        }, 6000);
      } else {
        // Quick update for other services
        setTimeout(async () => {
          await fetchServices();
          setLoading(prev => ({ ...prev, [id]: false }));
        }, 3000);
      }
    } catch (err) {
      console.error(`Failed to trigger restart for ${id}:`, err);
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="neo-flat interactive-card rounded-[40px] overflow-hidden mb-8 transition-all duration-300 ease-in-out border border-white/50 dark:border-white/5 shadow-neo-flat">
      {/* Header Bar */}
      <div className="flex justify-between items-center px-10 py-6 border-b border-gray-300/30 dark:border-gray-700/30">
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Server size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Active Services</h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Daemon & port monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {fetchError && (
            <div className="text-[9px] font-bold uppercase tracking-wide text-amber-500">{fetchError}</div>
          )}
          <div className="flex items-center gap-2 neo-pressed px-3 py-1 rounded-full">
            <Activity size={10} className="text-indigo-500" />
            <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Orchestrator</span>
          </div>
        </div>
      </div>

      {/* Services List Content */}
      <div className="px-10 py-8">
        {services.length === 0 ? (
          <div className="text-xs text-gray-500 italic py-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            Scanning background ports...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service) => {
              const isOnline = service.status === 'online';
              const isRestarting = loading[service.id];

              return (
                <div 
                  key={service.id} 
                  className="neo-pressed rounded-3xl p-5 flex flex-col justify-between border border-white/20 dark:border-black/20"
                >
                  <div>
                    {/* Header: Name & Status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-left">
                        <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                          {service.name}
                        </h3>
                        <span className="text-[9px] font-mono text-gray-500 uppercase">
                          Port {service.port}
                        </span>
                      </div>
                      
                      {/* Live status badge */}
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${
                        isOnline 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                          : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {service.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4 text-left">
                      {service.description}
                    </p>
                  </div>

                  {/* Footer Action Button */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[8px] flex items-center gap-1 text-gray-500 uppercase font-bold">
                      <Shield size={10} className="text-indigo-400" />
                      HITL Protected
                    </span>
                    
                    <button
                      type="button"
                      disabled={isRestarting}
                      onClick={() => handleRestart(service.id)}
                      className={`neo-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        isRestarting 
                          ? 'opacity-50 cursor-not-allowed text-indigo-400' 
                          : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:scale-105 active:scale-95'
                      }`}
                    >
                      <RefreshCw size={10} className={`${isRestarting ? 'animate-spin' : ''}`} />
                      {isRestarting ? 'Restarting...' : 'Restart'}
                    </button>
                  </div>

                  {/* Reload tooltip for self-restart */}
                  {service.id === 'next_dev' && isRestarting && (
                    <div className="mt-2 text-center text-[8px] font-bold text-amber-500 animate-pulse uppercase tracking-wide">
                      Server compiling... page will refresh in 6s
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
