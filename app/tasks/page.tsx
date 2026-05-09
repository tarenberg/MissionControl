"use client";

import React, { useState, useEffect, useRef } from 'react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToColumn = (index: number) => {
    if (scrollRef.current && scrollRef.current.children[index]) {
      scrollRef.current.children[index].scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest'
      });
    }
  };

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
      projectId: filterProjectId === 'all' ? '' : filterProjectId,
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
        const savedTask = await response.json();
        
        if (editingTask) {
          setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
        } else {
          setTasks(prev => [savedTask, ...prev]);
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
        setTasks(prev => prev.filter(t => t.id !== id));
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
    <div className="h-full flex flex-col -mt-4 bg-neo-bg p-8 transition-colors duration-300 overflow-hidden">
      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-4xl mb-2 drop-shadow-sm uppercase">Tasks</h1>
          <div className="flex items-center gap-3">
             <div className="neo-pressed px-4 py-1.5 rounded-full">
                <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest m-0">Project Backlog & Kanban</p>
             </div>
          </div>
        </div>
        
        <button
          onClick={handleAddClick}
          className="neo-button no-3d text-blue-600 dark:text-blue-400 px-8 py-4 rounded-[28px] font-black uppercase tracking-widest shadow-neo-button active:neo-button-active flex items-center gap-3 group transition-all"
        >
          <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          Add New Task
        </button>
      </div>

      <div className="flex items-center gap-6 mb-10 flex-shrink-0 bg-white/10 dark:bg-black/5 backdrop-blur-md p-6 rounded-[32px] border border-white/20 dark:border-white/5 sticky top-0 z-30">
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Quick Jump</span>
          <div className="flex gap-2">
            {columns.map((status, index) => (
              <button
                key={`jump-${status}`}
                onClick={() => scrollToColumn(index)}
                className="neo-button no-3d px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter hover:text-blue-600 dark:hover:text-blue-400 active:neo-button-active transition-all"
                title={`Jump to ${status}`}
              >
                {status === 'In Progress' ? 'Active' : status}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-10 w-[1px] bg-gray-300/50 dark:bg-gray-700/50"></div>
        
        <div className="flex flex-col gap-1.5 flex-1 max-w-[300px]">
          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Filter by Project</span>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="neo-button no-3d w-full px-5 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-widest bg-neo-bg focus:outline-none shadow-neo-button active:neo-button-active text-gray-700 dark:text-gray-300 border-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 pb-10">
        <div 
          ref={scrollRef}
          className="flex gap-8 h-full w-full overflow-x-auto custom-scrollbar pb-4 relative"
        >
          {columns.map(status => (
            <div key={status} className="flex-1 min-w-[280px] flex flex-col neo-flat rounded-[40px] border border-white/50 dark:border-white/5 shadow-neo-flat overflow-hidden">
              <div className="p-6 flex justify-between items-center bg-white/20 dark:bg-black/10 backdrop-blur-md border-b border-gray-300/30 dark:border-gray-700/30">
                <h2 className="flex items-center gap-3 text-gray-800 dark:text-gray-200 font-black uppercase tracking-widest text-[11px]">
                  <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${
                    status === 'Done' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                    status === 'Blocked' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                    status === 'Waiting' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' :
                    status === 'In Progress' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-gray-400'
                  }`}></span>
                  {status}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="neo-pressed text-[10px] font-black text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-full">
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
                    className="neo-button no-3d w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 active:neo-button-active transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {filteredTasks
                  .filter(task => task.status === status)
                  .map(task => (
                    <div 
                      key={task.id} 
                      className="neo-button no-3d p-6 rounded-[32px] border border-white/50 dark:border-white/5 shadow-neo-button active:neo-button-active group relative cursor-default transition-all hover:scale-[1.02]"
                    >
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <h3 className="text-gray-800 dark:text-gray-200 font-bold text-[13px] leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</h3>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(task)} className="neo-pressed p-1.5 rounded-lg text-gray-400 hover:text-blue-600 transition-colors" title="Edit task">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteConfirm(task.id)} className="neo-pressed p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors" title="Delete task">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-3 mb-6 font-medium leading-relaxed">{task.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center mt-auto pt-5 border-t border-gray-300/30 dark:border-gray-700/30">
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate max-w-[140px] flex items-center gap-2">
                           <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                           {task.project?.title || 'Studio'}
                        </span>
                        
                        <select 
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-[9px] bg-neo-bg border-none neo-pressed rounded-full px-3 py-1 text-gray-500 dark:text-gray-400 font-black tracking-[0.15em] uppercase focus:ring-0 cursor-pointer active:neo-button-active transition-all"
                        >
                          {columns.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                {filteredTasks.filter(t => t.status === status).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 px-6 opacity-20">
                    <div className="neo-pressed p-6 rounded-[32px] mb-4">
                       <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Empty Shelf</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="neo-flat rounded-[40px] shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200 border border-white/50 dark:border-white/5">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-2xl mb-8 uppercase border-b border-gray-300/30 dark:border-gray-700/30 pb-4">
              {editingTask ? 'Edit Task' : 'Add Task'}
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Title *
                </label>
                <div className="neo-pressed p-1 rounded-2xl">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-bold text-sm"
                    placeholder="Task title"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Description
                </label>
                <div className="neo-pressed p-1 rounded-2xl">
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-medium text-xs leading-relaxed"
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Status
                  </label>
                  <div className="neo-pressed p-1 rounded-2xl">
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-bold text-xs appearance-none cursor-pointer"
                    >
                      {statusCycle.map((status) => (
                        <option key={status} value={status} className="bg-neo-bg">
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Project
                  </label>
                  <div className="neo-pressed p-1 rounded-2xl">
                    <select
                      value={formData.projectId}
                      onChange={(e) =>
                        setFormData({ ...formData, projectId: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-bold text-xs appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-neo-bg">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id} className="bg-neo-bg">
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-10">
              <div className="flex gap-4 w-full">
                {editingTask ? (
                  <button
                    onClick={() => {
                      setDeleteConfirm(editingTask.id);
                      handleModalClose();
                    }}
                    className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 active:neo-button-active flex-1"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={handleModalClose}
                    className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 active:neo-button-active flex-1"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveTask}
                  className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 active:neo-button-active flex-1 shadow-lg"
                >
                  Save Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="neo-flat rounded-[40px] shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-white/50 dark:border-white/5">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-2xl mb-4 uppercase">Delete?</h2>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              Permanent removal. Cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 active:neo-button-active"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirm)}
                className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 active:neo-button-active"
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
