'use client';

import React, { useEffect, useState } from 'react';

interface Deadline {
  title: string;
  link: string;
  organization?: string;
  location?: string;
  deadline?: string;
  source: string;
}

const ArtDeadlines: React.FC = () => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/art-deadlines')
      .then(res => res.json())
      .then(data => {
        setDeadlines(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching deadlines:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-muted">Loading art deadlines...</div>;
  if (deadlines.length === 0) return <div className="p-4 text-muted">No upcoming deadlines found.</div>;

  return (
    <div className="bg-card rounded-3xl shadow-sm border border-border-custom overflow-hidden">
      <div className="bg-card px-5 py-4 border-b border-border-custom flex justify-between items-center">
        <h3 className="text-foreground flex items-center uppercase tracking-tight">
          <span className="mr-2 text-lg">🎨</span> Deadlines
        </h3>
        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">The Art Guide</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
        <ul className="divide-y divide-border-custom">
          {deadlines.map((item, index) => (
            <li key={index} className="p-5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                <div className="font-bold text-blue-600 dark:text-blue-400 hover:underline">{item.title}</div>
                {item.organization && (
                  <div className="text-sm text-muted mt-1 font-medium">{item.organization}</div>
                )}
                <div className="flex justify-between items-center mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                  <span>{item.location || 'Online/Various'}</span>
                  {item.deadline && (
                    <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full border border-red-100 dark:border-red-900/30">
                      Due: {item.deadline}
                    </span>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ArtDeadlines;
