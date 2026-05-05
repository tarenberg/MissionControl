"use client";

import React from 'react';
import { X, Cpu, Target, Layers, Zap } from 'lucide-react';

interface AgentDetailModalProps {
  agent: {
    id: string;
    name: string;
    model?: string;
    state: string;
    currentTask?: string;
    subagents: string[];
    description?: string;
    emoji: string;
    reportsTo?: string;
  };
  onClose: () => void;
}

const stateColors: Record<string, string> = {
  'busy': 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]',
  'waiting': 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]',
  'failed': 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
  'idle': 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]',
};

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <div 
        className="relative w-full max-w-lg bg-card border border-border-custom rounded-3xl p-8 shadow-2xl transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors border border-border-custom shadow-sm active:translate-y-0.5"
        >
          <X size={20} className="text-muted-foreground" />
        </button>

        {/* Header section with Emoji and Pulse */}
        <div className="flex items-start gap-6 mb-8">
          <div className="text-7xl p-4 bg-background rounded-2xl border border-border-custom shadow-inner">
            {agent.emoji}
          </div>
          <div className="pt-2 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold m-0">{agent.name}</h2>
              <div className={`w-3 h-3 rounded-full ${stateColors[agent.state] || stateColors.idle} animate-pulse`} />
            </div>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
              {agent.state} | {agent.id}
            </p>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mb-8 p-5 bg-muted/30 rounded-2xl border border-border-custom italic text-foreground/80 leading-relaxed text-sm">
          {agent.description || "No mission description provided for this specialized agent."}
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-card border border-border-custom rounded-2xl shadow-sm flex items-center gap-3">
            <Cpu size={18} className="text-blue-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold m-0">Model</p>
              <p className="text-xs font-semibold m-0 truncate max-w-[120px]">{agent.model || 'Unknown'}</p>
            </div>
          </div>
          <div className="p-4 bg-card border border-border-custom rounded-2xl shadow-sm flex items-center gap-3">
            <Layers size={18} className="text-purple-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold m-0">Hierarchy</p>
              <p className="text-xs font-semibold m-0">{agent.reportsTo ? `Reports to ${agent.reportsTo}` : 'Root Agent'}</p>
            </div>
          </div>
        </div>

        {/* Current Activity */}
        {agent.currentTask && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Target size={14} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Current Activity</span>
            </div>
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl text-xs font-medium text-foreground">
              {agent.currentTask}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all active:translate-y-1 active:shadow-inner border-b-4 border-primary-foreground/20">
            Talk to {agent.name}
          </button>
          <button className="p-4 bg-muted border border-border-custom rounded-2xl hover:bg-muted/80 transition-all active:translate-y-1 shadow-md">
            <Zap size={20} className="text-yellow-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentDetailModal;
