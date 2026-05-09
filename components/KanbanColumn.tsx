import React from 'react';
import TaskCard from './TaskCard';
import { Task } from '../interfaces/Task';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  statusColor: string; // e.g., 'border-blue-500'
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, statusColor }) => {
  return (
    <div className="flex-1 neo-flat rounded-[32px] p-6 shadow-neo-flat border-t-8" style={{ borderColor: statusColor }}>
      <h2 className="text-gray-800 dark:text-gray-200 text-lg font-black mb-6 flex items-center uppercase tracking-widest">
        <span className="w-2.5 h-2.5 rounded-full mr-3 shadow-[0_0_10px_rgba(0,0,0,0.2)]" style={{ backgroundColor: statusColor }}></span>
        {title} <span className="ml-2 text-gray-400 font-bold">({tasks.length})</span>
      </h2>
      <div className="min-h-[100px] space-y-4">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
