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
  // Determine background color based on status and isCentral
  let bgColorClass = 'bg-gray-100'; // Default
  if (isCentral) {
    bgColorClass = 'bg-purple-200';
  } else if (status === 'Active') {
    bgColorClass = 'bg-green-200'; // Active agents get green
  } else if (status === 'Busy') { // New condition for busy agents
    bgColorClass = 'bg-yellow-200'; // Busy agents get yellow
  }

  return (
    <div className={`p-4 rounded-lg shadow-lg text-center ${bgColorClass} border border-gray-300`}>
      <h3 className="mb-1 text-gray-900">{name}</h3>
      <p className="text-gray-700 text-sm mb-1">{role}</p>
      <p className="text-gray-500 text-xs mb-2">Model: {model}</p>
      <div className="flex flex-wrap justify-center gap-1">
        {tags.map((tag, index) => (
          <span key={index} className="bg-white text-gray-800 text-xs px-2 py-1 rounded-full border border-gray-300">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AgentCard;
