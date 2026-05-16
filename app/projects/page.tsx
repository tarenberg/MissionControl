"use client";

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  githubUrl?: string;
  localUrl?: string;
  devUrl?: string;
  launchUrl?: string;
  createdAt?: string;
}

interface ActivePort {
  port: number;
  pid: number;
  name: string;
}

const statusColors: Record<string, string> = {
  'active': 'text-green-600 dark:text-green-400',
  'planning': 'text-indigo-600 dark:text-indigo-400',
  'paused': 'text-yellow-600 dark:text-yellow-400',
  'archived': 'text-gray-600 dark:text-gray-400',
  'abandoned': 'text-red-600 dark:text-red-400',
};

const statusDotColors: Record<string, string> = {
  'active': 'bg-green-500',
  'planning': 'bg-indigo-500',
  'paused': 'bg-yellow-500',
  'archived': 'bg-gray-500',
  'abandoned': 'bg-red-500',
};

const statusOptions = ['active', 'planning', 'paused', 'archived', 'abandoned'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activePorts, setActivePorts] = useState<ActivePort[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<Project | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'active',
    githubUrl: '',
    localUrl: '',
    devUrl: '',
  });
  const [loading, setLoading] = useState(true);

  // Fetch projects and active ports
  const fetchData = async () => {
    try {
      const [projectsRes, portsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/system-status/ports')
      ]);

      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (portsRes.ok) {
        const data = await portsRes.json();
        setActivePorts(data.activePorts || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh ports every 5 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/system-status/ports');
        if (res.ok) {
          const data = await res.json();
          setActivePorts(data.activePorts || []);
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddClick = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      status: 'active',
      githubUrl: '',
      localUrl: '',
      devUrl: '',
    });
    setShowModal(true);
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      status: project.status,
      githubUrl: project.githubUrl || '',
      localUrl: project.localUrl || '',
      devUrl: project.devUrl || '',
    });
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const handleSaveProject = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      const url = editingProject
        ? `/api/projects/${editingProject.id}`
        : '/api/projects';
      const method = editingProject ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedProject = await response.json();
        if (editingProject) {
          setProjects(projects.map(p => (p.id === updatedProject.id ? updatedProject : p)));
        } else {
          setProjects([...projects, updatedProject]);
        }
        handleModalClose();
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const handleArchiveProject = async (id: string) => {
    setArchiving(true);
    try {
      const response = await fetch(`/api/projects/${id}/archive`, {
        method: 'POST',
      });

      if (response.ok) {
        setProjects(projects.map(p => p.id === id ? { ...p, status: 'archived' } : p));
        setArchiveConfirm(null);
        alert('Project successfully archived to C:\\Users\\tberg\\Documents\\_ARCHIVE');
      } else {
        const err = await response.json();
        alert(`Failed to archive: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to archive project:', error);
      alert('An error occurred during archiving');
    } finally {
      setArchiving(false);
    }
  };

  const handleSpinUp = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/spinup`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        const protocol = data.protocol || 'http';
        let message = `Spinning up ${project.title} on port ${data.port}... A new terminal window should open.`;
        
        if (project.devUrl) {
          try {
            const urlObj = new URL(project.devUrl.startsWith('http') ? project.devUrl : `${protocol}://${project.devUrl}`);
            const portMismatch = urlObj.port !== String(data.port);
            const protocolMismatch = !project.devUrl.startsWith(protocol);

            if (portMismatch || protocolMismatch) {
              const newUrl = `${protocol}://${urlObj.hostname}:${data.port}`;
              message += `\n\nNote: Config mismatch detected. Try this link instead: ${newUrl}`;
            } else {
              message += `\n\nOnce ready, you can access it at: ${project.devUrl}`;
            }
          } catch (e) {
            message += `\n\nAccess it at: ${protocol}://100.109.216.115:${data.port}`;
          }
        } else {
          message += `\n\nAccess it at: ${protocol}://100.109.216.115:${data.port}`;
        }
        alert(message);
        // Refresh everything immediately
        fetchData();
      } else {
        const error = await response.json();
        alert(`Failed to spin up: ${error.error}`);
      }
    } catch (error) {
      console.error('Spin up error:', error);
      alert('An error occurred during spin up.');
    }
  };

  const handleStopProject = async (port: number) => {
    if (!confirm(`Are you sure you want to stop the project running on port ${port}?`)) return;
    
    try {
      const response = await fetch(`/api/system-status/ports?port=${port}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setActivePorts(activePorts.filter(p => p.port !== port));
      } else {
        alert('Failed to stop project');
      }
    } catch (e) {
      console.error('Stop error:', e);
      alert('An error occurred.');
    }
  };

  const handleStatusRotate = async (project: Project) => {
    const currentIdx = statusOptions.indexOf(project.status);
    const nextStatus = statusOptions[(currentIdx + 1) % statusOptions.length];
    
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: nextStatus } : p));

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to rotate status:', error);
      fetchData(); // Revert on error
    }
  };

  const handleViewTasks = (projectId: string) => {
    window.location.href = `/tasks?projectId=${projectId}`;
  };

  const handleViewDocs = (project: Project) => {
    // Determine the folder name in docs/projects
    let folderName = project.title.replace(/\s+/g, '');
    
    // Manual overrides for existing folder names
    if (project.title === 'Mission Control Application') folderName = 'MissionControl';
    if (project.title === 'SecondBrain') folderName = 'second-brain';
    if (project.title === 'Picture Hanger Pro 3') folderName = 'PictureHangerPro3';
    
    window.location.href = `/docs?path=/docs/projects/${folderName}`;
  };

  const getRunningProjectPort = (project: Project) => {
    // Try to match based on project's devUrl port if available
    if (project.devUrl) {
      try {
        const url = new URL(project.devUrl.startsWith('http') ? project.devUrl : `http://${project.devUrl}`);
        const port = parseInt(url.port);
        if (activePorts.some(ap => ap.port === port)) return port;
      } catch (e) {}
    }
    return null;
  };

  const sortedProjects = React.useMemo(() => {
    return [...projects].sort((a, b) => {
      const indexA = statusOptions.indexOf(a.status);
      const indexB = statusOptions.indexOf(b.status);
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      return a.title.localeCompare(b.title);
    });
  }, [projects]);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-8 bg-neo-bg min-h-screen transition-colors duration-300">
      <div className="flex justify-between items-center mb-12 ml-4">
        <div>
          <h1 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-4xl mb-2 drop-shadow-sm uppercase">Projects</h1>
          <div className="flex items-center gap-3">
             <div className="neo-pressed px-4 py-1.5 rounded-full">
                <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest m-0">Project Registry & Deployment</p>
             </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          {activePorts.length > 0 && (
            <div className="neo-pressed px-4 py-2 rounded-2xl flex items-center gap-3">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
              <span className="text-[10px] font-black text-green-700 dark:text-green-500 uppercase tracking-widest">
                {activePorts.length} Live {activePorts.length === 1 ? 'Process' : 'Processes'}
              </span>
            </div>
          )}
          <button
            onClick={handleAddClick}
            className="neo-button no-3d px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 active:neo-button-active"
          >
            Add Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sortedProjects.map((project) => {
          const runningPort = getRunningProjectPort(project);
          const dotColor = statusDotColors[project.status] || 'bg-gray-500';
          
          return (
            <div
              key={project.id}
              className={`neo-flat rounded-[32px] border border-white/50 dark:border-white/5 flex flex-col transition-all hover:scale-[1.01] overflow-hidden ${
                runningPort ? 'ring-2 ring-green-500/30' : ''
              }`}
            >
              {/* Status Band */}
              <div 
                onClick={() => handleStatusRotate(project)}
                className={`h-6 w-full cursor-pointer transition-all hover:brightness-110 active:opacity-80 relative group/band flex items-center justify-center ${dotColor}`}
                title="Click to rotate status"
              >
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] drop-shadow-sm group-hover/band:opacity-0 transition-opacity">
                  {project.status}
                </span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/band:opacity-100 transition-opacity">
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md">
                    Rotate Status
                  </span>
                </div>
              </div>

              <div className="p-8 flex flex-col flex-1">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-gray-800 dark:text-gray-200 font-black text-xl tracking-tight uppercase">{project.title}</h3>
                      {runningPort && (
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        </span>
                      )}
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-6 line-clamp-3 leading-relaxed">{project.description}</p>
                  )}

                  <div className="space-y-4 mb-8">
                    {project.githubUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🔗</span>
                        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline truncate">
                          GitHub Source
                        </a>
                      </div>
                    )}

                    {project.localUrl && (
                      <div className="space-y-3">
                        <div className="neo-pressed p-3 rounded-2xl flex items-center gap-3 overflow-hidden group">
                          <span className="text-sm grayscale group-hover:grayscale-0 transition-all">📁</span>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate flex-1" title={project.localUrl}>
                            {project.localUrl}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {runningPort ? (
                            <button
                              onClick={() => handleStopProject(runningPort)}
                              className="neo-button no-3d px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 active:neo-button-active flex-1"
                            >
                              Stop Process
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSpinUp(project)}
                              className="neo-button no-3d px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 active:neo-button-active flex-1"
                            >
                              Spin Up
                            </button>
                          )}
                          {project.devUrl && (
                            <a
                              href={project.devUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`neo-button no-3d px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-center flex-1 active:neo-button-active ${
                                runningPort 
                                  ? 'text-green-600 dark:text-green-400 shadow-neo-pressed' 
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              Open App
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-3 mt-4 pt-6 border-t border-gray-300/30 dark:border-gray-700/30">
                  <button
                    onClick={() => handleViewTasks(project.id)}
                    className="neo-button no-3d px-3 py-2 rounded-xl text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest active:neo-button-active"
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => handleViewDocs(project)}
                    className="neo-button no-3d px-3 py-2 rounded-xl text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest active:neo-button-active"
                  >
                    Docs
                  </button>
                  <button
                    onClick={() => handleEditClick(project)}
                    className="neo-button no-3d px-3 py-2 rounded-xl text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest active:neo-button-active"
                  >
                    Edit
                  </button>
                  {project.status !== 'archived' && (
                    <button
                      onClick={() => setArchiveConfirm(project)}
                      className="neo-button no-3d px-3 py-2 rounded-xl text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest active:neo-button-active"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(project.id)}
                    className="neo-button no-3d px-3 py-2 rounded-xl text-[9px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest active:neo-button-active"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500 py-20 neo-flat rounded-[40px] border-2 border-dashed border-gray-300/50 dark:border-gray-700/50 uppercase font-black tracking-widest text-[10px] italic">
          No projects found in the registry.
        </div>
      )}

      {/* Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="neo-flat rounded-[40px] shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200 border border-white/50 dark:border-white/5">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-2xl mb-8 uppercase border-b border-gray-300/30 dark:border-gray-700/30 pb-4">
              {editingProject ? 'Edit Project' : 'Add Project'}
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="project-title" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Title *
                </label>
                <div className="neo-pressed p-1 rounded-2xl">
                  <input
                    id="project-title"
                    name="project-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-bold text-sm"
                    placeholder="Project title"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="project-desc" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Description
                </label>
                <div className="neo-pressed p-1 rounded-2xl">
                  <textarea
                    id="project-desc"
                    name="project-desc"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-medium text-xs leading-relaxed"
                    placeholder="Project description"
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="project-status" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Status
                </label>
                <div className="neo-pressed p-1 rounded-2xl">
                  <select
                    id="project-status"
                    name="project-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-800 dark:text-gray-200 font-bold text-sm appearance-none cursor-pointer"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status} className="bg-neo-bg">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="project-github" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    GitHub URL
                  </label>
                  <div className="neo-pressed p-1 rounded-2xl">
                    <input
                      id="project-github"
                      name="project-github"
                      type="url"
                      value={formData.githubUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, githubUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-blue-600 dark:text-blue-400 font-mono text-xs font-bold"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="project-local" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Local Path
                  </label>
                  <div className="neo-pressed p-1 rounded-2xl">
                    <input
                      id="project-local"
                      name="project-local"
                      type="text"
                      value={formData.localUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, localUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-gray-600 dark:text-gray-400 font-mono text-xs"
                      placeholder="C:\Users\tberg\Documents\..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="project-dev-url" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Dev URL
                  </label>
                  <div className="neo-pressed p-1 rounded-2xl">
                    <input
                      id="project-dev-url"
                      name="project-dev-url"
                      type="text"
                      value={formData.devUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, devUrl: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold"
                      placeholder="http://localhost:3001"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10">
              <button
                onClick={handleModalClose}
                className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 active:neo-button-active"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                className="neo-button no-3d px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 active:neo-button-active shadow-lg"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="neo-flat rounded-[40px] shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-white/50 dark:border-white/5">
            <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter text-2xl mb-4 uppercase">Archive?</h2>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              Compress <strong>{archiveConfirm.title}</strong> into <code>_ARCHIVE</code>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                disabled={archiving}
                onClick={() => setArchiveConfirm(null)}
                className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 active:neo-button-active"
              >
                Cancel
              </button>
              <button
                disabled={archiving}
                onClick={() => handleArchiveProject(archiveConfirm.id)}
                className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 active:neo-button-active flex items-center gap-2"
              >
                {archiving ? 'Archiving...' : 'Confirm'}
              </button>
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
              Permanent removal from registry. Cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="neo-button no-3d px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 active:neo-button-active"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm)}
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
