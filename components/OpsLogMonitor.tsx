
'use client';

import { useState, useEffect, useRef } from 'react';

type LogType = 'app' | 'gateway';

const OpsLogMonitor = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [logType, setLogType] = useState<LogType>('app');
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/system/logs?type=${logType}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLogs(data);
        setError(null);
      } catch (e) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError('An unknown error occurred');
        }
      }
    };

    const intervalId = setInterval(fetchLogs, 3000);
    fetchLogs(); // Initial fetch

    return () => clearInterval(intervalId);
  }, [logType]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const toggleLogType = () => {
    setLogType(prevType => (prevType === 'app' ? 'gateway' : 'app'));
  };

  return (
    <div className="neo-flat p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">Operations Log</h2>
        <button onClick={toggleLogType} className="neo-flat px-4 py-2 rounded-md">
          Switch to {logType === 'app' ? 'Gateway' : 'App'}
        </button>
      </div>
      <div
        ref={logContainerRef}
        className="neo-pressed p-4 rounded-lg bg-gray-900 text-green-400 font-mono text-sm h-64 overflow-y-auto"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
      >
        {error ? (
          <div className="text-red-500">{`Error: ${error}`}</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-gray-300">
              <span className="text-green-500 mr-2">{`>`}</span>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OpsLogMonitor;
