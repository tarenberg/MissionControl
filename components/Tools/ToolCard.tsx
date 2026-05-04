import React from 'react';

interface ToolCardProps {
  name: string;
  description: string;
  id: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ name, description, id }) => {
  return (
    <div className="bg-card p-4 rounded-2xl shadow-lg border border-border-custom flex flex-col justify-between interactive-card">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2" title={description}>{name}</h3>
        <p className="text-muted text-sm">{description}</p>
      </div>
      <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors" title={`Click to launch the ${name} tool`}>
        Launch Tool
      </button>
    </div>
  );
};

export default ToolCard;
