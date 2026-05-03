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
  const [data, setData] = useState<{ environment: NestEnvironment[], sensors: NestSensor[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/studio/environment');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch studio environment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="bg-gray-100 rounded-lg px-5 py-3 text-sm text-gray-400">Syncing with Studio Nest...</div>;
  if (!data || !data.environment.length) return null;

  const formatTemp = (c: number) => ((c * 9/5) + 32).toFixed(1);

  return (
    <div className="flex flex-wrap items-center gap-6 bg-gray-100 rounded-lg px-5 py-3 text-sm text-gray-600 mb-6">
      <span className="font-semibold text-gray-800">Studio Bridge</span>
      
      {data.environment.map(env => (
        <React.Fragment key={env.id}>
          <div className="flex items-center gap-2" title={`${env.name} - ${env.mode}`}>
            <span>🌡️ {env.name}:</span>
            <span className="font-medium text-gray-900">{formatTemp(env.temperature)}°F</span>
          </div>
          
          <span className="text-gray-300">|</span>
          
          <div className="flex items-center gap-2" title="Humidity">
            <span>💧 Humidity:</span>
            <span className="font-medium text-gray-900">{env.humidity}%</span>
          </div>
        </React.Fragment>
      ))}

      {data.sensors.map(sensor => (
        <React.Fragment key={sensor.id}>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2" title={sensor.type}>
            <span>{sensor.type === 'doorbell' ? '🚪' : '📹'} {sensor.name}:</span>
            <span className={`font-medium ${sensor.status === 'ONLINE' ? 'text-green-600' : 'text-red-600'}`}>
              {sensor.status}
            </span>
          </div>
        </React.Fragment>
      ))}

      <span className="text-gray-300">|</span>

      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span className="text-xs text-gray-400 uppercase tracking-tighter">Nest Connected</span>
      </div>
    </div>
  );
}
