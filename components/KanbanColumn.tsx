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
    <div className="flex-1 bg-white rounded-lg p-4 shadow-xl border-t-4" style={{ borderColor: statusColor.split('-')[1]}}>
      <h2 className="text-gray-900 text-xl font-bold mb-4 flex items-center">
        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: statusColor.split('-')[1]}}></span>
        {title} ({tasks.length})
      </h2>
      <div className="min-h-[100px]">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
