'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

type LogType = 'app' | 'gateway';

interface ParsedLog {
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'UNKNOWN';
  message: string;
  time: string;
  raw: string;
}

function parseLog(rawLog: string): ParsedLog {
  try {
    const parsed = JSON.parse(rawLog);
    const level = parsed._meta?.logLevelName || 'UNKNOWN';
    const rawMessage = parsed['1'] || parsed.message || rawLog;
    // Ensure message is always a string
    const message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
    const time = parsed.time || parsed._meta?.date || '';
    return { level, message, time, raw: rawLog };
  } catch {
    // If parsing fails, treat as raw text
    return {
      level: 'UNKNOWN',
      message: rawLog,
      time: '',
      raw: rawLog
    };
  }
}

function getLogColor(level: string): string {
  switch (level) {
    case 'ERROR': return 'text-red-500 dark:text-red-400';
    case 'WARN': return 'text-yellow-500 dark:text-yellow-400';
    case 'INFO': return 'text-gray-500 dark:text-gray-400';
    case 'DEBUG': return 'text-blue-500 dark:text-blue-400';
    default: return 'text-gray-600 dark:text-gray-500';
  }
}

function getLogBadge(level: string): string {
  switch (level) {
    case 'ERROR': return 'bg-red-500';
    case 'WARN': return 'bg-yellow-500';
    case 'INFO': return 'bg-blue-500';
    case 'DEBUG': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
}

const OpsLogMonitor = () => {
  const [logs, setLogs] = useState<ParsedLog[]>([]);
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
        const parsed = data.map(parseLog);
        setLogs(parsed);
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
                  <div key={index} className="flex gap-3 group items-start">
                    <span className="text-blue-500/30 select-none font-black text-[9px] w-6 text-right mt-1">{ (index + 1).toString().padStart(2, '0') }</span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 ${getLogBadge(log.level)} shadow-[0_0_4px_currentColor]`} />
                    <div className="flex-1 space-y-0.5">
                      <div className={`text-[10px] font-bold uppercase tracking-wide ${getLogColor(log.level)}`}>
                        {log.level}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 break-words">
                        {log.message}
                      </div>
                      {log.time && (
                        <div className="text-[9px] text-gray-400 dark:text-gray-600">
                          {new Date(log.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      )}
                    </div>
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
