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
    <div className="bg-card p-4 rounded-3xl shadow-xl border border-border-custom h-full flex flex-col interactive-card">
      <h2 className="mb-4">Long-Term Memory (MEMORY.md)</h2>
      <div className="flex-1 overflow-y-auto bg-background p-3 rounded-xl text-foreground font-mono text-sm border border-border-custom">
        {loading ? (
          <p>Loading long-term memory...</p>
        ) : (
          <pre className="whitespace-pre-wrap">{content}</pre>
        )}
      </div>
    </div>
  );
};

export default LongTermMemoryDisplay;
