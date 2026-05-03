import React from 'react';

interface AlwaysRunningSectionProps {
  runningTasks: { title: string; frequency: string; }[];
}

const AlwaysRunningSection: React.FC<AlwaysRunningSectionProps> = ({ runningTasks }) => {
  return (
    <div className="bg-gray-100 rounded-lg p-3 mb-4">
      <h2 className="text-gray-900 text-lg font-bold mb-2 flex items-center">
        <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Always Running
      </h2>
      <div className="flex flex-wrap gap-2">
        {runningTasks.map((task, index) => (
          <span key={index} className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
            {task.title} - {task.frequency}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AlwaysRunningSection;
