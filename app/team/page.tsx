"use client";

import React, { useState, useEffect } from 'react';
import AgentDetailModal from '@/components/AgentDetailModal';

interface Agent {
  id: string;
  name: string;
  model?: string;
  state: 'busy' | 'waiting' | 'failed' | 'idle';
  currentTask?: string;
  lastActiveTime?: string;
  subagents: string[];
  emoji: string;
  description?: string;
  reportsTo?: string;
}

const agentEmojis: Record<string, string> = {
  'M': '🧁',
  'J': '⚙️',
  'P': '🎨',
  'H': '🏠',
  'Sc': '🔭',
  'Se': '🛡️',
  'MP': '🏛️',
};

const stateColors: Record<string, string> = {
  'busy': 'bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-800',
  'waiting': 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-800',
  'failed': 'bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-800',
  'idle': 'bg-card border-border-custom',
};

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          setAgents(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const renderAgent = (agentId: string, level: number = 0) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    const hasSubagents = agent.subagents && agent.subagents.length > 0;

    return (
      <div key={agent.id} className="flex flex-col items-center relative">
        {/* Card Wrapper */}
        <div className="relative flex flex-col items-center">
          <div
            onClick={() => setSelectedAgent(agent)}
            className={`z-10 ${level === 0 ? 'w-40 h-28' : 'w-36 h-24'} border-2 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition shadow-sm hover:shadow-md hover:scale-105 active:scale-95 ${
              stateColors[agent.state]
            }`}
          >
            <div className={`${level === 0 ? 'text-4xl' : 'text-3xl'} mb-1`}>{agentEmojis[agent.id] || '🤖'}</div>
            <div className="text-center">
              <div className={`font-bold text-foreground ${level === 0 ? 'text-base' : 'text-sm'}`}>{agent.name}</div>
              <div className="text-[10px] text-muted truncate max-w-[120px]">{agent.model || 'Unknown'}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                {agent.state}
              </div>
            </div>
          </div>

          {agent.currentTask && (
            <div className="mt-2 text-[10px] text-muted text-center max-w-[150px] italic">
              "{agent.currentTask.substring(0, 40)}..."
            </div>
          )}

          {/* Vertical line coming out of the bottom of the card */}
          {hasSubagents && (
            <div className="w-[2px] h-8 bg-border-custom mt-2"></div>
          )}
        </div>

        {/* Sub-agents Container */}
        {hasSubagents && (
          <div className="flex gap-12 justify-center min-w-max px-8 relative">
            {/* The Horizontal Connector Line */}
            {agent.subagents.length > 1 && (
               <div className="absolute top-0 h-[2px] bg-border-custom" 
                    style={{ 
                      left: `${100 / (agent.subagents.length * 2)}%`, 
                      right: `${100 / (agent.subagents.length * 2)}%` 
                    }} 
               />
            )}

            {agent.subagents.map((subId) => {
              return (
                <div key={subId} className="relative pt-8">
                  {/* Vertical connector from horizontal line to child */}
                  <div className="absolute top-0 left-1/2 w-[2px] h-8 bg-border-custom -translate-x-1/2"></div>
                  {renderAgent(subId, level + 1)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 min-h-screen bg-background overflow-auto">
      <h1 className="mb-16">Agent Network</h1>
      
      <div className="flex justify-center w-full min-w-max pb-20">
        {renderAgent('M')}
      </div>

      {selectedAgent && (
        <AgentDetailModal 
          agent={selectedAgent} 
          onClose={() => setSelectedAgent(null)} 
        />
      )}
    </div>
  );
}
