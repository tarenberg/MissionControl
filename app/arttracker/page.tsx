"use client";

import React from 'react';

const DEFAULT_URL = "http://192.168.1.53:8080/tools/ArtTrackerDashboard/dist/";
const ARTTRACKER_URL = process.env.NEXT_PUBLIC_ARTTRACKER_URL || DEFAULT_URL;

export default function ArtTrackerPage() {
  const openDashboard = () => {
    window.open(ARTTRACKER_URL, '_blank');
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1>ArtTracker Dashboard</h1>
      <p className="text-gray-600">
        The ArtTracker UI blocks cross-origin iframes (Apache sends <code className="text-gray-900">X-Frame-Options: SAMEORIGIN</code>),
        so Mission Control opens it in a dedicated tab. Click the button below to launch it using your configured URL.
      </p>
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
        <div>
          <p className="text-gray-500 text-sm">Current launch URL:</p>
          <code className="text-gray-900 break-all">{ARTTRACKER_URL}</code>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Open ArtTracker Dashboard
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(ARTTRACKER_URL)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-2 rounded-md"
          >
            Copy URL
          </button>
        </div>
        <p className="text-gray-500 text-xs">
          Need a different host/port? Set <code>NEXT_PUBLIC_ARTTRACKER_URL</code> in <code>.env.local</code> and restart Mission Control.
        </p>
      </div>
    </div>
  );
}
