'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

type LogType = 'app' | 'gateway';

const OpsLogMonitor = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [logType, setLogType] = useState<LogType>('app');
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/system/logs?type=${logType}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setLogs(data);
        setError(null);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        setLogs([]);
      }
    } catch (e) {
      if (e instanceof Error) {
          setError(e.message);
      } else {
          setError('An unknown error occurred');
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(fetchLogs, 5000);
    fetchLogs(); // Initial fetch

    return () => clearInterval(intervalId);
  }, [logType]);

  useEffect(() => {
    if (logContainerRef.current && !isCollapsed) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const toggleLogType = () => {
    setLogType(prevType => (prevType === 'app' ? 'gateway' : 'app'));
  };

  return (
    <div className="neo-flat interactive-card rounded-[40px] overflow-hidden mb-12 transition-all duration-300 ease-in-out border border-white/50 dark:border-white/5 shadow-neo-flat">
      {/* Header Bar */}
      <div 
        className="flex justify-between items-center px-10 py-6 cursor-pointer select-none border-b border-gray-300/30 dark:border-gray-700/30"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="neo-pressed p-3 rounded-2xl text-blue-600 dark:text-blue-400">
            {logType === 'gateway' ? <Activity size={20} className="neo-glow-blue" /> : <Terminal size={20} className="neo-glow-blue" />}
          </div>
          <div>
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">
              Ops Feed: <span className="text-blue-600 dark:text-blue-400">{logType}</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Real-time system telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleLogType();
            }} 
            className="neo-button no-3d text-[9px] font-black uppercase tracking-widest px-6 py-2.5 rounded-2xl text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 active:neo-button-active shadow-neo-button transition-all"
          >
            Switch to {logType === 'app' ? 'Gateway' : 'App'}
          </button>

          <div className="neo-pressed p-2 rounded-xl text-gray-400 dark:text-gray-600">
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </div>
      </div>

      {/* Log Content Section */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
        <div className="px-10 pb-10 pt-4">
          <div
            ref={logContainerRef}
            className="neo-pressed p-8 rounded-[32px] bg-neo-bg text-gray-800 dark:text-gray-300 font-mono text-[11px] leading-relaxed h-[400px] overflow-y-auto custom-scrollbar border border-black/10 dark:border-white/5 relative"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
          >
            {isRefreshing && (
              <div className="absolute top-4 right-4 z-10">
                <RefreshCw size={16} className="text-blue-500 animate-spin opacity-50" />
              </div>
            )}

            {error ? (
              <div className="flex items-center gap-3 text-red-500 dark:text-red-400 bg-red-500/5 p-5 rounded-2xl border border-red-500/20 font-black uppercase tracking-tighter text-[10px]">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                System Fault: {error}
              </div>
            ) : (
              <div className="space-y-2">
                {logs.length === 0 && (
                  <div className="text-gray-500 italic font-medium">Listening for log packets...</div>
                )}
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-4 group">
                    <span className="text-blue-500/30 select-none font-black text-[9px] w-6 text-right mt-0.5">{ (index + 1).toString().padStart(2, '0') }</span>
                    <div className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">{log}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpsLogMonitor;
