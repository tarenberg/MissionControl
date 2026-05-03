"use client";

import React, { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  model?: string;
  state: 'busy' | 'waiting' | 'failed' | 'idle';
  currentTask?: string;
  lastActiveTime?: string;
  subagents: string[];
}

const agentEmojis: Record<string, string> = {
  'main': '🧁',
  'jason': '⚙️',
  'pixels': '🎨',
  'housekeeper': '🏠',
};

const stateColors: Record<string, string> = {
  'busy': 'bg-green-100 border-green-400',
  'waiting': 'bg-yellow-100 border-yellow-400',
  'failed': 'bg-red-100 border-red-400',
  'idle': 'bg-white border-gray-200',
};

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

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
            className={`z-10 ${level === 0 ? 'w-40 h-28' : 'w-36 h-24'} border-2 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition shadow-sm hover:shadow-md ${
              stateColors[agent.state]
            }`}
          >
            <div className={`${level === 0 ? 'text-4xl' : 'text-3xl'} mb-1`}>{agentEmojis[agent.id] || '🤖'}</div>
            <div className="text-center">
              <div className={`font-bold text-gray-900 ${level === 0 ? 'text-base' : 'text-sm'}`}>{agent.name}</div>
              <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{agent.model || 'Unknown'}</div>
              <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                {agent.state}
              </div>
            </div>
          </div>

          {agent.currentTask && (
            <div className="mt-2 text-[10px] text-gray-500 text-center max-w-[150px] italic">
              "{agent.currentTask.substring(0, 40)}..."
            </div>
          )}

          {/* Vertical line coming out of the bottom of the card */}
          {hasSubagents && (
            <div className="w-[2px] h-8 bg-gray-200 mt-2"></div>
          )}
        </div>

        {/* Sub-agents Container */}
        {hasSubagents && (
          <div className="flex gap-12 justify-center min-w-max px-8 relative">
            {/* The Horizontal Connector Line */}
            {agent.subagents.length > 1 && (
               <div className="absolute top-0 h-[2px] bg-gray-200" 
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
                  <div className="absolute top-0 left-1/2 w-[2px] h-8 bg-gray-200 -translate-x-1/2"></div>
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
    <div className="p-8 min-h-screen bg-white overflow-auto">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-16">Agent Network</h1>
      
      <div className="flex justify-center w-full min-w-max pb-20">
        {renderAgent('main')}
      </div>
    </div>
  );
}
