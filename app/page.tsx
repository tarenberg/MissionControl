"use client";

import React, { useState, useEffect } from 'react';
import SystemMonitor from '../components/SystemMonitor';
import StudioMonitor from '../components/StudioMonitor';
import OpsLogMonitor from '../components/OpsLogMonitor';
import LiveActivities from '../components/LiveActivities';
import OpsPulse from '../components/OpsPulse';

interface SkillInfo {
  name: string;
  description: string;
  category: string;
}

const CATEGORY_ORDER = [
  'Coding & Dev',
  'AI & Memory',
  'Productivity',
  'Communication',
  'Media & Creative',
  'Smart Home',
  'Utilities',
  'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Coding & Dev':   '⚙️',
  'AI & Memory':    '🧠',
  'Productivity':   '📋',
  'Communication':  '💬',
  'Media & Creative': '🎨',
  'Smart Home':     '🏠',
  'Utilities':      '🔧',
  'Other':          '📦',
};

export default function HomePage() {
  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([]);

  const [modelStatus, setModelStatus] = useState({
    openClawModels: [] as string[],
    ollamaModels: [] as string[],
    loading: true
  });

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills');
        const data = await response.json();
        if (Array.isArray(data)) {
          setAvailableSkills(data);
        } else {
          setAvailableSkills([]);
        }
      } catch (error) {
        console.error('Failed to fetch skills:', error);
        setAvailableSkills([]);
      }
    };
    fetchSkills();
  }, []);

  useEffect(() => {
    const fetchModelsStatus = async () => {
      try {
        const response = await fetch('/api/models-status?t=' + Date.now());
        const data = await response.json();
        setModelStatus({
          openClawModels: Array.isArray(data.openClawModels) ? data.openClawModels : [],
          ollamaModels: Array.isArray(data.ollamaModels) ? data.ollamaModels : [],
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch models status:', error);
        setModelStatus({
          openClawModels: [],
          ollamaModels: [],
          loading: false
        });
      }
    };

    fetchModelsStatus();
    // Poll models less frequently since they rarely change
    const intervalId = setInterval(fetchModelsStatus, 60000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen p-12 text-foreground bg-neo-bg">
      <div className="mb-12 ml-4 flex justify-between items-start">
        <div>
          <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-4xl mb-2 drop-shadow-sm uppercase">Mission Control</h1>
          <div className="flex items-center gap-3">
            <div className="neo-pressed px-4 py-1.5 rounded-full">
              <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest m-0">Studio Command Center v2.5</p>
            </div>
            <div className="h-[1px] w-12 bg-gray-300 dark:bg-gray-700"></div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-bold italic">Ready for your command, Tom.</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <a href="/art-tracker" className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 active:neo-button-active">
            Art Tracker
          </a>
          <a href="/projects" className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 active:neo-button-active">
            Manage Projects
          </a>
          <a href="/tasks" className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 active:neo-button-active">
            View Tasks
          </a>
        </div>
      </div>

      {/* System Status */}
      <section className="mb-12">
        <div className="flex flex-col gap-6">
          <OpsPulse />
          <SystemMonitor />
          <StudioMonitor />
          <OpsLogMonitor />
          <LiveActivities />

          <div className="flex items-center gap-3 mb-6 ml-2">
            <div className="neo-pressed p-2 rounded-xl text-blue-600 dark:text-blue-400">
              <span className="text-lg">🤖</span>
            </div>
            <h2 className="text-gray-800 dark:text-gray-200 font-bold tracking-tight m-0 uppercase tracking-widest text-xs">Available Models</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="neo-flat p-8 rounded-[40px] border border-white/50 dark:border-white/5 shadow-neo-flat relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-4xl">🌐</span>
              </div>
              <h3 className="mb-6 border-b border-gray-300/30 dark:border-gray-700/30 pb-4 text-gray-800 dark:text-gray-200 font-black uppercase tracking-widest text-[11px]">OpenClaw Config</h3>
              {modelStatus.loading ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 italic text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Fetching status...
                </div>
              ) : (
                <ul className="space-y-3">
                  {modelStatus.openClawModels.length === 0 ? (
                    <li className="text-gray-400 dark:text-gray-500 text-xs italic">No models found</li>
                  ) : (
                    modelStatus.openClawModels.map((model, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <div className="neo-pressed p-1.5 rounded-full text-blue-500 dark:text-blue-400">
                          <div className="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 text-xs font-bold font-mono">{model}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="neo-flat p-8 rounded-[40px] border border-white/50 dark:border-white/5 shadow-neo-flat relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-4xl">🏠</span>
              </div>
              <h3 className="mb-6 border-b border-gray-300/30 dark:border-gray-700/30 pb-4 text-gray-800 dark:text-gray-200 font-black uppercase tracking-widest text-[11px]">Local Models (Ollama)</h3>
              {modelStatus.loading ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 italic text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Fetching status...
                </div>
              ) : (
                <ul className="space-y-3">
                  {modelStatus.ollamaModels.length === 0 ? (
                    <li className="text-gray-400 dark:text-gray-500 text-xs italic">None available</li>
                  ) : (
                    modelStatus.ollamaModels.map((model, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <div className="neo-pressed p-1.5 rounded-full text-orange-500 dark:text-orange-400">
                          <div className="w-1 h-1 rounded-full bg-orange-500 dark:bg-orange-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 text-xs font-bold font-mono">{model}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Skills List — grouped by category */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8 ml-2">
            <div className="neo-pressed p-2 rounded-xl text-purple-600 dark:text-purple-400">
              <span className="text-lg">⚡</span>
            </div>
            <h2 className="text-gray-800 dark:text-gray-200 font-bold tracking-tight m-0 uppercase tracking-widest text-xs">Available Skills</h2>
        </div>
        
        {(() => {
          const grouped = availableSkills.reduce<Record<string, SkillInfo[]>>((acc, s) => {
            (acc[s.category] = acc[s.category] || []).push(s);
            return acc;
          }, {});
          return CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat} className="mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-3">
                <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                {cat}
                <div className="h-[1px] flex-1 bg-gray-300/30 dark:bg-gray-700/30 ml-2"></div>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grouped[cat].map((skill) => (
                  <div key={skill.name} className="neo-button no-3d border border-white/40 dark:border-white/5 rounded-[28px] px-6 py-5 shadow-neo-button active:neo-button-active group transition-all">
                    <div className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{skill.name}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-[10px] leading-relaxed font-medium line-clamp-2">{skill.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </section>

    </div>
  );
}
