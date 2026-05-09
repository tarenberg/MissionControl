
"use client";
import React, { useState, useEffect } from 'react';

export default function TestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const endpoints = [
    '/api/skills',
    '/api/models-status',
    '/api/studio/environment',
    '/api/live-activities',
    '/api/system-status',
    '/api/system/pulse',
    '/api/system/logs',
    '/api/projects',
    '/api/tasks',
    '/api/cron-jobs'
  ];

  const runProfiling = async () => {
    setIsRunning(true);
    setResults([]);
    const newResults = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        const duration = Date.now() - start;
        newResults.push({
          endpoint,
          status: res.status,
          duration,
          size: JSON.stringify(data).length,
          data
        });
      } catch (err: any) {
        newResults.push({
          endpoint,
          status: 'error',
          duration: Date.now() - start,
          error: err.message
        });
      }
      setResults([...newResults]);
    }
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-neo-bg p-8 text-foreground">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Ops Pulse Latency Profiler</h1>
            <p className="text-gray-500 mt-1">Benchmarking Mission Control API Performance</p>
          </div>
          <button 
            onClick={runProfiling}
            disabled={isRunning}
            className={`neo-button px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all
              ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:neo-glow-blue active:neo-button-active'}`}
          >
            {isRunning ? 'Profiling...' : 'Start Profile Run'}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((res, i) => (
            <div key={i} className="neo-flat p-6 rounded-3xl space-y-4 border border-white/20 dark:border-white/5">
              <div className="flex justify-between items-start">
                <h3 className="font-mono text-sm truncate pr-2 text-blue-600 dark:text-blue-400">{res.endpoint}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${res.status === 200 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {res.status}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${res.duration > 1000 ? 'text-red-500' : res.duration > 300 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {res.duration}
                </span>
                <span className="text-gray-400 text-xs font-bold uppercase">ms</span>
              </div>

              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                <span>Size: {res.size ? (res.size / 1024).toFixed(1) : 0} KB</span>
                <span>Latency: {res.duration < 100 ? 'Excelent' : res.duration < 500 ? 'Good' : 'Needs Optimization'}</span>
              </div>

              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${res.duration > 1000 ? 'bg-red-500' : res.duration > 300 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (res.duration / 3000) * 100)}%` }}
                />
              </div>
            </div>
          ))}

          {results.length === 0 && !isRunning && (
            <div className="col-span-full py-20 text-center neo-pressed rounded-3xl">
              <p className="text-gray-400 font-medium">Ready for baseline profiling.</p>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="neo-flat p-8 rounded-3xl border border-white/20 dark:border-white/5">
            <h2 className="text-xl font-bold mb-4">Detailed Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Duration</th>
                    <th className="py-3 px-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-900 last:border-0 hover:bg-white/5">
                      <td className="py-3 px-4 font-mono text-xs">{res.endpoint}</td>
                      <td className="py-3 px-4">
                        <span className={`w-2 h-2 rounded-full inline-block mr-2 ${res.status === 200 ? 'bg-green-500' : 'bg-red-500'}`} />
                        {res.status}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{res.duration}ms</td>
                      <td className="py-3 px-4 text-right text-gray-500">{(res.size / 1024).toFixed(1)} KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
