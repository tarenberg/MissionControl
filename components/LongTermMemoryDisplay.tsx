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
    <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Long-Term Memory (MEMORY.md)</h2>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 rounded-md text-gray-900 font-mono text-sm">
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
