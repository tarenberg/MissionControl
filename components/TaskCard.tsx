import React from 'react';
import { Task } from '../interfaces/Task';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const assigneeColor = task.assignedTo === 'M' ? 'bg-purple-600' : 'bg-blue-600';
  const assigneeLabel = task.assignedTo === 'M' ? 'Muffin' : 'Tom';

  return (
    <div className="bg-white p-3 rounded-md shadow mb-3 border-l-4 border-purple-500">
      <h3 className="text-gray-900 text-lg font-semibold">{task.title}</h3>
      {task.description && <p className="text-gray-500 text-sm mt-1 mb-2">{task.description}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className={`${assigneeColor} text-gray-900 text-xs px-2 py-1 rounded-full`}>
          {assigneeLabel}
        </span>
        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1">
            {task.tags.map((tag, index) => (
              <span key={index} className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
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
