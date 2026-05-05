"use client";

import React, { useEffect } from 'react';

export default function ArtTrackerPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎨</span>
        <h1 className="text-3xl font-bold text-foreground">ArtTracker Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border-custom shadow-sm interactive-card">
          <h2 className="text-xl mb-4 font-semibold text-foreground">Launch Application</h2>
          <p className="text-muted text-sm mb-6">
            The ArtTracker UI may block cross-origin iframes, so we open it in a dedicated tab.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => window.open(`http://${window.location.hostname}:8080/tools/ArtTrackerDashboard/dist/index.html`, '_blank')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🚀</span> Open Production (Port 8080)
            </button>
            
            <button
              onClick={() => window.open(`http://${window.location.hostname}:3001/tools/ArtTrackerDashboard/`, '_blank')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🛠️</span> Open Dev (Port 3001)
            </button>
            
            <button
              onClick={() => window.open(`http://${window.location.hostname}:3002/tools/ArtTrackerDashboard/`, '_blank')}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🧪</span> Open Dev (Port 3002)
            </button>
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-border-custom shadow-sm interactive-card">
          <h2 className="text-xl mb-4 font-semibold text-foreground">Configuration</h2>
          <p className="text-muted text-sm mb-4">
            Current Host: <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-foreground">{typeof window !== 'undefined' ? window.location.hostname : '...'}</code>
          </p>
          <div className="text-xs text-muted bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-border-custom">
            <p className="font-bold mb-2 uppercase tracking-widest text-[10px]">Troubleshooting</p>
            <ul className="list-disc pl-4 space-y-2">
              <li>Ensure <strong>XAMPP/Apache</strong> is running for Port 8080.</li>
              <li>Ensure <strong>ArtTracker Dev Server</strong> is running for Port 3001/3002.</li>
              <li>If using Tailscale, use the <strong>Tailscale IP</strong> as the host.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
