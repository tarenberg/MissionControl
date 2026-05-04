"use client";

import React, { useState, useEffect } from 'react';
import ArtDeadlines from '../components/ArtDeadlines';
import SystemMonitor from '../components/SystemMonitor';
import StudioMonitor from '../components/StudioMonitor';

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
        setAvailableSkills(data);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
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
          openClawModels: data.openClawModels || [],
          ollamaModels: data.ollamaModels || [],
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch models status:', error);
        setModelStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchModelsStatus();
    // Poll models less frequently since they rarely change
    const intervalId = setInterval(fetchModelsStatus, 60000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen p-8 text-foreground">
      <h1 className="mb-4">Welcome to Mission Control</h1>
      <p className="text-muted text-base mb-10">Your central hub for managing tasks, agents, and custom tools.</p>

      {/* System Status */}
      <section className="mb-8 flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <SystemMonitor />
          <StudioMonitor />

          <h2 className="mb-4">Available Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-3xl border border-border-custom shadow-sm interactive-card">
              <h3 className="mb-4 border-b border-border-custom pb-2">OpenClaw Config</h3>
              {modelStatus.loading ? (
                <p className="text-muted italic" title="Attempting to retrieve model status from the server.">Fetching status...</p>
              ) : (
                <ul className="list-disc pl-5">
                  {modelStatus.openClawModels.length === 0 ? <li className="text-muted" title="No OpenClaw models are currently configured or available.">No models found</li> :
                    modelStatus.openClawModels.map((model, idx) => (
                      <li key={idx} className="text-muted mb-1">{model}</li>
                    ))
                  }
                </ul>
              )}
            </div>

            <div className="bg-card p-6 rounded-3xl border border-border-custom shadow-sm interactive-card">
              <h3 className="mb-4 border-b border-border-custom pb-2">Local Models (Ollama)</h3>
              {modelStatus.loading ? (
                <p className="text-muted italic" title="Attempting to retrieve model status from the server.">Fetching status...</p>
              ) : (
                <ul className="list-disc pl-5">
                  {modelStatus.ollamaModels.length === 0 ? <li className="text-muted" title="No local Ollama models were found.">None</li> :
                    modelStatus.ollamaModels.map((model, idx) => (
                      <li key={idx} className="text-muted mb-1">{model}</li>
                    ))
                  }
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-1/3">
          <ArtDeadlines />
        </div>
      </section>

      {/* Skills List — grouped by category */}
      <section className="mb-10">
        <h2 className="mb-6">Available Skills</h2>
        {(() => {
          const grouped = availableSkills.reduce<Record<string, SkillInfo[]>>((acc, s) => {
            (acc[s.category] = acc[s.category] || []).push(s);
            return acc;
          }, {});
          return CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
                {CATEGORY_ICONS[cat]} {cat}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[cat].map((skill) => (
                  <div key={skill.name} className="bg-card border border-border-custom rounded-2xl px-4 py-3 shadow-sm interactive-card">
                    <div className="font-medium text-sm">{skill.name}</div>
                    <div className="text-muted text-xs mt-1 line-clamp-2">{skill.description}</div>
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
