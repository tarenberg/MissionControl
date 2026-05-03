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

  if (loading) return <div className="p-4 text-gray-500">Loading art deadlines...</div>;
  if (deadlines.length === 0) return <div className="p-4 text-gray-500">No upcoming deadlines found.</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 flex items-center">
          <span className="mr-2">🎨</span> Upcoming Art Deadlines
        </h3>
        <span className="text-xs text-gray-500">Source: The Art Guide</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <ul className="divide-y divide-gray-50">
          {deadlines.map((item, index) => (
            <li key={index} className="p-4 hover:bg-gray-50 transition-colors">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                <div className="font-medium text-blue-600 hover:underline">{item.title}</div>
                {item.organization && (
                  <div className="text-sm text-gray-600 mt-1">{item.organization}</div>
                )}
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span>{item.location || 'Online/Various'}</span>
                  {item.deadline && (
                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
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
