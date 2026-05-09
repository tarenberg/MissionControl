"use client";

import React from 'react';
import ArtTrackerDashboard from '@/components/ArtTrackerDashboard';

export default function ArtTrackerPage() {
  return (
    <div className="bg-neo-bg min-h-screen">
      <ArtTrackerDashboard appName="Art Tracker" artistName="Tom Arenberg" />
    </div>
  );
}
