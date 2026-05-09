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
  'busy': 'text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]',
  'waiting': 'text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]',
  'failed': 'text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  'idle': 'text-gray-400',
};

const stateDotColors: Record<string, string> = {
  'busy': 'bg-green-500',
  'waiting': 'bg-yellow-500',
  'failed': 'bg-red-500',
  'idle': 'bg-gray-400',
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
    return (
      <div className="p-12 min-h-screen bg-neo-bg flex items-center justify-center">
        <div className="neo-flat rounded-2xl px-8 py-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Retrieving Team Status...</span>
        </div>
      </div>
    );
  }

  const renderAgent = (agentId: string, level: number = 0) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    const hasSubagents = agent.subagents && agent.subagents.length > 0;
    const dotColor = stateDotColors[agent.state] || 'bg-gray-400';

    return (
      <div key={agent.id} className="flex flex-col items-center relative">
        {/* Card Wrapper */}
        <div className="relative flex flex-col items-center group">
          <div
            onClick={() => setSelectedAgent(agent)}
            className={`z-10 ${level === 0 ? 'w-48 h-32' : 'w-40 h-28'} neo-flat rounded-[32px] border border-white/50 dark:border-white/5 p-5 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:neo-button-active shadow-neo-flat`}
          >
            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${dotColor} ${agent.state === 'busy' ? 'animate-pulse' : ''} shadow-[0_0_5px_rgba(0,0,0,0.1)]`}></div>
            
            <div className={`${level === 0 ? 'text-4xl' : 'text-3xl'} mb-2 group-hover:scale-110 transition-transform duration-300`}>{agentEmojis[agent.id] || '🤖'}</div>
            <div className="text-center">
              <div className={`font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight ${level === 0 ? 'text-sm' : 'text-xs'}`}>{agent.name}</div>
              <div className="text-[9px] text-gray-400 dark:text-gray-500 font-mono font-bold mt-1 uppercase tracking-tighter">{agent.model || 'Unknown'}</div>
            </div>
          </div>

          {agent.currentTask && (
            <div className="mt-4 neo-pressed px-3 py-1.5 rounded-xl text-[9px] text-gray-500 dark:text-gray-400 text-center max-w-[180px] italic font-medium leading-tight">
              "{agent.currentTask.substring(0, 50)}..."
            </div>
          )}

          {/* Vertical line coming out of the bottom of the card */}
          {hasSubagents && (
            <div className="w-[1px] h-12 bg-gray-300 dark:bg-gray-700 mt-4"></div>
          )}
        </div>

        {/* Sub-agents Container */}
        {hasSubagents && (
          <div className="flex gap-16 justify-center min-w-max px-12 relative">
            {/* The Horizontal Connector Line */}
            {agent.subagents.length > 1 && (
               <div className="absolute top-0 h-[1px] bg-gray-300 dark:bg-gray-700" 
                    style={{ 
                      left: `${100 / (agent.subagents.length * 2)}%`, 
                      right: `${100 / (agent.subagents.length * 2)}%` 
                    }} 
               />
            )}

            {agent.subagents.map((subId) => {
              return (
                <div key={subId} className="relative pt-12">
                  {/* Vertical connector from horizontal line to child */}
                  <div className="absolute top-0 left-1/2 w-[1px] h-12 bg-gray-300 dark:bg-gray-700 -translate-x-1/2"></div>
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
    <div className="p-12 min-h-screen bg-neo-bg overflow-auto transition-colors duration-300">
      <div className="mb-20 ml-4 text-center">
        <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-5xl mb-3 drop-shadow-sm uppercase">Agent Network</h1>
        <div className="flex items-center justify-center gap-3">
          <div className="neo-pressed px-6 py-2 rounded-full">
            <p className="text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-[0.3em] m-0">Hierarchical Node Map</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center w-full min-w-max pb-32">
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
