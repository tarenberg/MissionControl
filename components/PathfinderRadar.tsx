"use client";

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  EyeOff, 
  Layers, 
  TrendingUp, 
  Compass, 
  Loader2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface Deadline {
  title: string;
  location: string;
  due_date: string;
  link: string;
  source: string;
}

export default function PathfinderRadar() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'priorities' | 'all'>('priorities');

  const fetchDeadlines = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/art-deadlines');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort by due date (closest first)
        const sorted = data.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        setDeadlines(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch deadlines:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const handleDismiss = async (link: string) => {
    try {
      const res = await fetch('/api/art-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link }),
      });
      if (res.ok) {
        // Filter out locally immediately
        setDeadlines(prev => prev.filter(d => d.link !== link));
      }
    } catch (err) {
      console.error('Failed to dismiss deadline:', err);
    }
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (dueDateStr: string) => {
    const today = new Date('2026-05-22T00:00:00'); // Standardize on current date Friday, May 22, 2026
    const dueDate = new Date(dueDateStr);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get color and text for days remaining
  const getUrgencyBadge = (days: number) => {
    if (days < 0) return { label: 'Ended', classes: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' };
    if (days === 0) return { label: 'DUE TODAY', classes: 'bg-red-500 text-white animate-pulse' };
    if (days === 1) return { label: 'DUE TOMORROW', classes: 'bg-red-500/90 text-white font-bold' };
    if (days <= 3) return { label: `${days} days left`, classes: 'bg-orange-500 text-white font-semibold' };
    if (days <= 7) return { label: `${days} days left`, classes: 'bg-amber-500 text-white' };
    return { label: `Due in ${days} days`, classes: 'bg-blue-600/10 text-blue-600 dark:text-blue-400' };
  };

  // Curated Trends for May 2026 (based on docs/Pathfinder-Trend-Radar.md)
  const trends = [
    {
      title: "Elemental Dynamics",
      vector: "Water / Hydrological Forces",
      description: "Curators are actively seeking works exploring fluid motion, liquid reflections, ocean depths, and aquatic forces.",
      opportunity: "Power of Water (Louisa Arts Center, due Tomorrow!)"
    },
    {
      title: "New Noir (The Velvet Palette)",
      vector: "Black-Palettes & Nocturnal Moods",
      description: "Exhibitors are highlighting deep velvet blacks, rich shadow play, and low-key nocturnes.",
      opportunity: "Velvet Exhibition (Manifest Gallery, due May 24)"
    },
    {
      title: "Materiality & Abstraction",
      vector: "Thick Texture & Physical Depth",
      description: "Curators are shifting focus toward heavy spatial structures, layered physical paint, and organic mediums.",
      opportunity: "Chromatic Reverie (TeraVarna, due May 31)"
    }
  ];

  // Map high priority links from Pathfinder recommendations
  const PRIORITY_KEYWORDS = [
    'america 250',
    'power of water',
    'velvet: a call',
    'midnight garden',
    'chromatic reverie'
  ];

  const filteredDeadlines = deadlines.filter(d => {
    const isPast = getDaysRemaining(d.due_date) < 0;
    if (isPast) return false; // Filter out old deadlines
    
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.location.toLowerCase().includes(searchTerm.toLowerCase());
                          
    if (!matchesSearch) return false;
    
    if (activeTab === 'priorities') {
      return PRIORITY_KEYWORDS.some(kw => d.title.toLowerCase().includes(kw));
    }
    
    return true;
  });

  return (
    <div className="neo-flat rounded-[40px] p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden border border-white/50 dark:border-white/5 shadow-neo-flat">
      
      {/* Dynamic Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COMPONENT: Market Analysis & Curatorial Vectors (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-5 border-r border-gray-300/20 dark:border-gray-700/20 pr-0 xl:pr-6">
          <div className="flex items-center gap-2">
            <div className="neo-pressed p-2 rounded-xl text-indigo-500">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">Pathfinder Trend Radar</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-0.5">Scraped Curatorial Mapping</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-1">
            {trends.map((t, idx) => (
              <div key={idx} className="neo-pressed rounded-2xl p-4 flex flex-col gap-1.5 hover:scale-[1.01] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    {t.title}
                  </span>
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Vector {idx + 1}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                  Focus: {t.vector}
                </p>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {t.description}
                </p>
                <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-gray-300/10 dark:border-gray-700/10">
                  <Sparkles size={11} className="text-amber-500 shrink-0" />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">
                    Match: {t.opportunity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COMPONENT: Active Opportunities Checklist (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="neo-pressed p-2 rounded-xl text-blue-500">
                <Compass size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">Show Submissions</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-0.5">Exhibitions & Art Calls Checklist</p>
              </div>
            </div>

            {/* Tab Switches */}
            <div className="neo-pressed p-0.5 rounded-full flex gap-1 self-start sm:self-auto bg-zinc-200/50 dark:bg-zinc-800/30">
              <button
                onClick={() => setActiveTab('priorities')}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border-none cursor-pointer transition-all ${
                  activeTab === 'priorities'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Top Matches
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border-none cursor-pointer transition-all ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                All Open ({deadlines.length})
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter by keyword or state..."
              className="neo-pressed rounded-xl py-2 px-3 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none transition-all w-full"
            />
          </div>

          {/* Content Stream */}
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 size={24} className="animate-spin mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Querying Active Calls...</span>
              </div>
            ) : filteredDeadlines.length === 0 ? (
              <div className="neo-pressed rounded-2xl p-8 text-center text-gray-400 italic text-xs">
                {searchTerm ? 'No results match your search keywords.' : 'No active calls found in this category.'}
              </div>
            ) : (
              filteredDeadlines.map((d, index) => {
                const daysLeft = getDaysRemaining(d.due_date);
                const badge = getUrgencyBadge(daysLeft);
                const isPriority = PRIORITY_KEYWORDS.some(kw => d.title.toLowerCase().includes(kw));

                return (
                  <div 
                    key={index} 
                    className={`neo-flat rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:scale-[1.005] ${
                      isPriority ? 'border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide shrink-0 ${badge.classes}`}>
                          {badge.label}
                        </span>
                        {isPriority && (
                          <span className="text-[9px] bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wide shrink-0">
                            🔥 Priority match
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          Source: {d.source}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight truncate">
                        {d.title}
                      </h4>
                      
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin size={10} className="text-red-400" />
                          {d.location}
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Calendar size={10} className="text-blue-400" />
                          Due: {d.due_date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={d.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="neo-button p-2.5 rounded-xl text-blue-500 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-all"
                        title="View Prospectus & Apply"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => handleDismiss(d.link)}
                        className="neo-button p-2.5 rounded-xl text-red-500 hover:text-red-600 flex items-center justify-center cursor-pointer transition-all border-none"
                        title="Dismiss Call"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
