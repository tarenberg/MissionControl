"use client";

import React, { useState, useEffect } from 'react';
import { getLongTermMemoryContent } from '../app/memory/actions';

const LongTermMemoryDisplay: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const longTermContent = await getLongTermMemoryContent();
      setContent(longTermContent);
      setLoading(false);
    };
    fetchContent();
  }, []);

  return (
    <div className="neo-flat rounded-[40px] p-10 border border-white/50 dark:border-white/5 h-full flex flex-col shadow-neo-flat overflow-hidden">
      <div className="flex items-center gap-4 mb-8 ml-2">
        <div className="neo-pressed p-3 rounded-2xl text-blue-600 dark:text-blue-400">
           <span className="text-xl neo-glow-blue">🏛️</span>
        </div>
        <div>
          <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Long-Term Memory</h2>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Distilled Knowledge Hub</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto neo-pressed p-8 rounded-[32px] bg-neo-bg text-gray-800 dark:text-gray-300 font-mono text-[11px] leading-relaxed border border-black/10 dark:border-white/5 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Core Archives...</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap">{content}</pre>
        )}
      </div>
    </div>
  );
};

export default LongTermMemoryDisplay;
