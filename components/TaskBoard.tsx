"use client";

import React, { useState, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import { Task } from '../interfaces/Task';
import { getWorkspaceTasksServer } from '../app/lib/tasks'; // Import the new server action

const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const fetchedTasks = await getWorkspaceTasksServer();
      setTasks(fetchedTasks);
    };

    fetchTasks();
    const intervalId = setInterval(fetchTasks, 5000); // Poll for updates every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  const getTasksByStatus = (status: Task['status']) => tasks.filter((task) => task.status === status);

  return (
    <div className="flex space-x-4 overflow-x-auto p-4">
      <KanbanColumn title="Recurring" tasks={getTasksByStatus('Recurring')} statusColor="#4CAF50" />
      <KanbanColumn title="Backlog" tasks={getTasksByStatus('Backlog')} statusColor="#2196F3" />
      <KanbanColumn title="In Progress" tasks={getTasksByStatus('In Progress')} statusColor="#FFC107" />
      <KanbanColumn title="Review" tasks={getTasksByStatus('Review')} statusColor="#FF9800" />
      <KanbanColumn title="Done" tasks={getTasksByStatus('Done')} statusColor="#9E9E9E" />
    </div>
  );
};

export default TaskBoard;
