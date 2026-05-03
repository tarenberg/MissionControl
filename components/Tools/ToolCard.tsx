import React from 'react';

interface ToolCardProps {
  name: string;
  description: string;
  id: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ name, description, id }) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-lg border border-gray-200 flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2" title={description}>{name}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors" title={`Click to launch the ${name} tool`}>
        Launch Tool
      </button>
    </div>
  );
};

export default ToolCard;
