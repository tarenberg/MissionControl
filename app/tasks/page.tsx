"use client";

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  title: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  projectId?: string;
  project?: Project;
  createdAt?: string;
}

const statusColors:Record<string, string> = {
  'Backlog': 'bg-gray-200 text-gray-800',
  'In Progress': 'bg-blue-200 text-blue-800',
  'Waiting': 'bg-yellow-200 text-yellow-800',
  'Blocked': 'bg-red-200 text-red-800',
  'Done': 'bg-green-200 text-green-800',
};

const statusCycle = ['Backlog', 'In Progress', 'Waiting', 'Blocked', 'Done'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Backlog',
    projectId: '',
  });
  const [loading, setLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Task; direction: 'asc' | 'desc' } | null>(null);

  // Fetch tasks and projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/projects'),
        ]);
        
        if (tasksRes.ok) {
          setTasks(await tasksRes.json());
        }
        if (projectsRes.ok) {
          setProjects(await projectsRes.json());
        }

        // Handle URL parameter for filtering
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('projectId');
        if (pid) {
          setFilterProjectId(pid);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddClick = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'Backlog',
      projectId: '',
    });
    setShowModal(true);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      projectId: task.projectId || '',
    });
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      const url = editingTask
        ? `/api/tasks/${editingTask.id}`
        : '/api/tasks';
      const method = editingTask ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Fetch all tasks again to ensure the UI has the new task with its project relation
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
          setTasks(await tasksRes.json());
        }
        handleModalClose();
      } else {
        const error = await response.json();
        alert(`Failed to save task: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleStatusToggle = async (task: Task) => {
    const currentIdx = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];
    handleStatusChange(task.id, nextStatus);
  };

  const handleMarkComplete = async (task: Task) => {
    handleStatusChange(task.id, 'Done');
  };

  const handleSort = (key: keyof Task) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = React.useMemo(() => {
    let sortableTasks = [...tasks];
    if (filterProjectId !== 'all') {
      sortableTasks = sortableTasks.filter(t => t.projectId === filterProjectId);
    }
    if (sortConfig !== null) {
      sortableTasks.sort((a, b) => {
        const aValue = (a[sortConfig.key] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTasks;
  }, [tasks, filterProjectId, sortConfig]);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const filteredTasks = sortedTasks;

  const columns = ['Backlog', 'In Progress', 'Waiting', 'Blocked', 'Done'];

  return (
    <div className="h-full flex flex-col -mt-4 bg-background">
      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div className="flex items-center gap-6">
          <h1>Tasks</h1>
          <div className="h-8 w-[1px] bg-border-custom"></div>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="px-4 py-2 border border-border-custom rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium text-foreground"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAddClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 group"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Add New Task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto min-h-0 pb-6 -mx-4 px-4">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map(status => (
            <div key={status} className="w-80 flex flex-col bg-card/40 rounded-2xl border border-border-custom shadow-sm overflow-hidden">
              <div className="p-4 flex justify-between items-center bg-card/60 backdrop-blur-md border-b border-border-custom">
                <h2 className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full shadow-sm ${
                    status === 'Done' ? 'bg-green-500' : 
                    status === 'Blocked' ? 'bg-red-500' :
                    status === 'Waiting' ? 'bg-yellow-500' :
                    status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></span>
                  {status}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-muted bg-card border border-border-custom px-2.5 py-1 rounded-full shadow-xs">
                    {filteredTasks.filter(t => t.status === status).length}
                  </span>
                  <button 
                    onClick={() => {
                      setEditingTask(null);
                      setFormData({
                        title: '',
                        description: '',
                        status: status,
                        projectId: filterProjectId === 'all' ? '' : filterProjectId,
                      });
                      setShowModal(true);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-card border border-border-custom text-muted hover:text-blue-600 hover:border-blue-200 shadow-xs transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {filteredTasks
                  .filter(task => task.status === status)
                  .map(task => (
                    <div 
                      key={task.id} 
                      className="bg-card p-5 rounded-xl shadow-sm border border-border-custom hover:border-blue-400/50 hover:shadow-md transition-all group relative cursor-default interactive-card"
                    >
                      <div className="flex justify-between items-start mb-2.5 gap-3">
                        <h3 className="text-[13px] leading-snug group-hover:text-blue-600 transition-colors">{task.title}</h3>
                        <button onClick={() => handleEditClick(task)} className="text-muted hover:text-blue-600 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                      
                      {task.description && (
                        <p className="text-[11px] text-muted line-clamp-3 mb-5 font-medium leading-relaxed">{task.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-border-custom">
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest truncate max-w-[140px]">
                          {task.project?.title || 'Studio'}
                        </span>
                        
                        <select 
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-[9px] bg-background border border-transparent rounded-lg px-2 py-1 text-muted font-bold tracking-wider uppercase focus:ring-0 focus:bg-card focus:border-blue-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
                        >
                          {columns.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                {filteredTasks.filter(t => t.status === status).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 px-4 opacity-10">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    <p className="text-[9px] font-bold uppercase tracking-widest">Empty Shelf</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4 border border-border-custom">
            <h2 className="mb-4">
              {editingTask ? 'Edit Task' : 'Add Task'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="Task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="Task description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                >
                  {statusCycle.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData({ ...formData, projectId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleModalClose}
                className="px-4 py-2 border border-border-custom rounded-md text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-sm w-full mx-4 border border-border-custom">
            <h2 className="mb-4">Delete Task?</h2>
            <p className="text-muted mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-border-custom rounded-md text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
