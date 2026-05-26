"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  jobName: string;
  type: 'cron' | 'heartbeat' | 'internal' | 'manual' | 'external';
  result: 'success' | 'failure' | 'alert' | 'info';
  message: string;
}

const LiveActivities: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('/api/live-activities', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`live-activities ${response.status}`);
        }
        const data = await response.json();
        
        if (Array.isArray(data)) {
          // Convert ISO string back to Date objects
          const parsedActivities = data.map(activity => ({
            ...activity,
            timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
          }));
          setActivities(parsedActivities.slice(0, 6)); 
        } else {
          setActivities([]);
        }
      } catch (error) {
        setActivities((prev) => prev ?? []);
      } finally {
        clearTimeout(timeout);
      }
    };

    fetchActivities();
    const intervalId = setInterval(fetchActivities, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="neo-flat rounded-[40px] overflow-hidden mb-12 transition-all duration-300 ease-in-out border border-white/50 dark:border-white/5 shadow-neo-flat">
      {/* Header Bar */}
      <div 
        className="flex justify-between items-center px-10 py-6 cursor-pointer select-none border-b border-gray-300/30 dark:border-gray-700/30"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-orange-600 dark:text-orange-400">
            <span className="text-xl neo-glow-orange">⚡</span>
          </div>
          <div className="text-left">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Live Pulse</h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Real-time activity log</p>
          </div>
        </div>

        <div className="neo-pressed p-2 rounded-xl text-gray-400 dark:text-gray-600">
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
        <div className="px-10 pb-10 pt-4">
          <div className="pr-2 custom-scrollbar space-y-4">
            {activities.length === 0 ? (
            <div className="neo-pressed p-6 rounded-3xl text-gray-500 dark:text-gray-600 text-xs italic text-center font-medium">
              No activity detected in recent packets.
            </div>
          ) : (
            activities.map((item) => (
              <div key={item.id} className="neo-button no-3d p-5 rounded-[28px] border border-white/40 dark:border-white/5 shadow-neo-button group transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em]">{item.type}</span>
                  <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 text-xs font-black uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{item.jobName}</p>
                <p className="text-gray-500 dark:text-gray-400 text-[10px] leading-relaxed font-medium">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default LiveActivities;
