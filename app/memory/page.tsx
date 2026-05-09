"use client";

import React from 'react';
import LongTermMemoryDisplay from '../../components/LongTermMemoryDisplay';
import DailyMemoryList from '../../components/DailyMemoryList';

export default function MemoryPage() {
  return (
    <div className="p-12 flex flex-col h-full bg-neo-bg min-h-screen transition-colors duration-300">
      <div className="mb-16 ml-4">
        <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-5xl mb-3 drop-shadow-sm uppercase">Agent Memory</h1>
        <div className="flex items-center gap-3">
          <div className="neo-pressed px-6 py-2 rounded-full">
            <p className="text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] m-0">Persistent Knowledge Graph</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 flex-1 items-stretch">
        {/* Long-Term Memory (MEMORY.md) */}
        <div className="h-full min-h-[600px]">
          <LongTermMemoryDisplay />
        </div>

        {/* Daily Memory (memory/YYYY-MM-DD.md) */}
        <div className="h-full min-h-[600px]">
          <DailyMemoryList />
        </div>
      </div>
    </div>
  );
}
