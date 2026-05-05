import React from 'react';

interface AgentCardProps {
  name: string;
  role: string;
  tags: string[];
  model?: string;
  status: string; // Add status property
  isCentral?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ name, role, tags, model, status, isCentral = false }) => {
  // Use neomorphic color cues for status
  let indicatorColor = 'bg-gray-400';
  if (isCentral) {
    indicatorColor = 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
  } else if (status === 'Active') {
    indicatorColor = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
  } else if (status === 'Busy') {
    indicatorColor = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
  }

  return (
    <div className="neo-flat p-5 rounded-3xl text-center min-w-[200px] relative overflow-hidden">
      {/* Status indicator pill */}
      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${indicatorColor}`}></div>
      
      <h3 className="mb-1 text-gray-800 font-bold tracking-tight">{name}</h3>
      <p className="text-gray-600 text-sm font-medium mb-1">{role}</p>
      
      <div className="neo-pressed rounded-xl py-1 px-3 mb-3 inline-block">
        <p className="text-gray-500 text-[10px] font-mono">MODEL: {model || 'N/A'}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
        {tags.map((tag, index) => (
          <span key={index} className="neo-pressed text-gray-600 text-[10px] px-2.5 py-1 rounded-full font-semibold">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AgentCard;
