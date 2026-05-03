import React from 'react';

interface NextUpSectionProps {
  nextUpTasks: { title: string; eta: string; }[];
}

const NextUpSection: React.FC<NextUpSectionProps> = ({ nextUpTasks }) => {
  return (
    <div className="bg-gray-100 rounded-lg p-3 mt-4">
      <h2 className="text-gray-900 text-lg font-bold mb-2">Next Up</h2>
      <ul>
        {nextUpTasks.map((task, index) => (
          <li key={index} className="text-gray-600 text-sm flex justify-between mb-1">
            <span>{task.title}</span>
            <span className="text-gray-500 text-xs">{task.eta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NextUpSection;
