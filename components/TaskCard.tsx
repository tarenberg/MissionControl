import React from 'react';
import { Task } from '../interfaces/Task';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const assigneeColor = task.assignedTo === 'M' ? 'bg-purple-600 dark:bg-purple-500' : 'bg-blue-600 dark:bg-blue-500';
  const assigneeLabel = task.assignedTo === 'M' ? 'Muffin' : 'Tom';

  return (
    <div className="neo-button no-3d p-4 rounded-2xl border border-white/40 dark:border-white/5 active:neo-button-active">
      <h3 className="text-gray-800 dark:text-gray-200 text-sm font-bold tracking-tight">{task.title}</h3>
      {task.description && <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-1.5 mb-3 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${assigneeColor}`}></div>
          <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            {assigneeLabel}
          </span>
        </div>
        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1">
            {task.tags.map((tag, index) => (
              <span key={index} className="neo-pressed text-gray-500 dark:text-gray-500 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
