"use client";

import React from 'react';
import LongTermMemoryDisplay from '../../components/LongTermMemoryDisplay';
import DailyMemoryList from '../../components/DailyMemoryList';

export default function MemoryPage() {
  return (
    <div className="p-4 flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Agent Memory Overview</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Long-Term Memory (MEMORY.md) */}
        <div className="h-[500px]">
          <LongTermMemoryDisplay />
        </div>

        {/* Daily Memory (memory/YYYY-MM-DD.md) */}
        <div className="h-[500px]">
          <DailyMemoryList />
        </div>
      </div>
    </div>
  );
}
