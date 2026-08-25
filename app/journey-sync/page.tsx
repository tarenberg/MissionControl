"use client";

import React, { useState, useEffect } from 'react';

interface JourneySyncEntry {
  id: string;
  title: string;
  date: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export default function JourneySyncPage() {
  const [entries, setEntries] = useState<JourneySyncEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/journey-sync');
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data.entries || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncStatus('syncing');
      const response = await fetch('/api/journey-sync', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      setSyncStatus('success');
      await fetchEntries();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncStatus('error');
      setError(err instanceof Error ? err.message : 'Sync failed');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Journey Sync</h1>
          <p className="text-slate-600">Connect and sync your journey data</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sync Status</h2>
              <p className="text-sm text-slate-600 mt-1">
                {loading ? 'Loading...' : `${entries.length} entries found`}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={loading || syncStatus === 'syncing'}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                syncStatus === 'syncing'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : syncStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : syncStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {/* Entries List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-slate-600">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No entries yet. Click "Sync Now" to fetch from Journey Sync.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{entry.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{entry.date}</p>
                    {entry.type && (
                      <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                        {entry.type}
                      </span>
                    )}
                  </div>
                  {entry.metadata && (
                    <div className="ml-4 text-right text-sm text-slate-600">
                      {Object.entries(entry.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
