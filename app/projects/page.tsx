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
  createdAt?: string;
}

interface ActivePort {
  port: number;
  pid: number;
}

const statusColors: Record<string, string> = {
  'active': 'bg-green-200 text-green-800',
  'planning': 'bg-indigo-200 text-indigo-800',
  'paused': 'bg-yellow-200 text-yellow-800',
  'archived': 'bg-gray-200 text-gray-800',
  'abandoned': 'bg-red-200 text-red-800',
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
    <div className="p-4 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1>Projects</h1>
        <div className="flex gap-4">
          {activePorts.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md px-3 py-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-medium text-green-700">
                {activePorts.length} Active {activePorts.length === 1 ? 'Process' : 'Processes'}
              </span>
            </div>
          )}
          <button
            onClick={handleAddClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm"
          >
            Add Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProjects.map((project) => {
          const runningPort = getRunningProjectPort(project);
          
          return (
            <div
              key={project.id}
              className={`bg-card rounded-lg border p-4 hover:shadow-md transition flex flex-col interactive-card ${
                runningPort ? 'border-green-400 ring-1 ring-green-100' : 'border-border-custom'
              }`}
            >
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground">{project.title}</h3>
                    {runningPort && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                  </div>
                  <span
                    onClick={() => handleStatusRotate(project)}
                    className={`px-2 py-1 rounded text-xs font-medium cursor-pointer select-none transition-all active:scale-95 ${
                      statusColors[project.status] || 'bg-gray-200'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">{project.description}</p>
                )}

                {project.githubUrl && (
                  <p className="text-xs text-blue-600 mb-1 truncate">
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                      🔗 GitHub
                    </a>
                  </p>
                )}

                {project.localUrl && (
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs text-muted truncate flex-1" title={project.localUrl}>
                      📁 {project.localUrl}
                    </p>
                    {runningPort ? (
                      <button
                        onClick={() => handleStopProject(runningPort)}
                        className="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSpinUp(project)}
                        className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-300"
                      >
                        Spin Up
                      </button>
                    )}
                    {project.devUrl && (
                      <a
                        href={project.devUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[10px] px-2 py-0.5 rounded border text-center ${
                          runningPort 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-700' 
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                      >
                        Open App
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-2 mt-4 pt-4 border-t border-gray-50">
                <button
                  onClick={() => handleViewTasks(project.id)}
                  className="flex-1 text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider py-1"
                >
                  Tasks
                </button>
                <button
                  onClick={() => handleViewDocs(project)}
                  className="flex-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase tracking-wider py-1"
                >
                  Docs
                </button>
                <button
                  onClick={() => handleEditClick(project)}
                  className="flex-1 text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider py-1"
                >
                  Edit
                </button>
                {project.status !== 'archived' && (
                  <button
                    onClick={() => setArchiveConfirm(project)}
                    className="flex-1 text-[10px] text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider py-1"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm(project.id)}
                  className="flex-1 text-[10px] text-red-600 hover:text-red-700 font-bold uppercase tracking-wider py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center text-muted py-12 bg-card rounded-lg border-2 border-dashed border-border-custom">
          No projects found
        </div>
      )}

      {/* Manual Process List for Orpaned Ports */}
      {activePorts.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border-custom">
          <h2 className="mb-4">Active Dev Processes</h2>
          <div className="bg-card rounded-lg border border-border-custom p-4">
            <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
              <div>Port</div>
              <div>PID</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>
            <div className="space-y-1">
              {activePorts.map((ap) => (
                <div key={ap.port} className="bg-card border border-border-custom rounded p-2 flex justify-between items-center text-sm shadow-sm">
                  <div className="font-mono font-bold text-blue-600">{ap.port}</div>
                  <div className="text-muted">{ap.pid}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-green-700">Listening</span>
                  </div>
                  <button 
                    onClick={() => handleStopProject(ap.port)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded border border-red-100"
                  >
                    Kill Process
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200 border border-border-custom">
            <h2 className="mb-4">
              {editingProject ? 'Edit Project' : 'Add Project'}
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
                  placeholder="Project title"
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
                  placeholder="Project description"
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
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, githubUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="https://github.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Local Path (for Spin Up)
                </label>
                <input
                  type="text"
                  value={formData.localUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, localUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="C:\Users\tberg\Documents\..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Dev URL (for Open App)
                </label>
                <input
                  type="text"
                  value={formData.devUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, devUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border-custom bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                  placeholder="http://localhost:3001"
                />
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
                onClick={handleSaveProject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-border-custom">
            <h2 className="mb-2">Archive Project?</h2>
            <p className="text-sm text-muted mb-6">
              This will compress <strong>{archiveConfirm.title}</strong> into a ZIP file in your <code>_ARCHIVE</code> folder to save space. 
            </p>
            <div className="flex justify-end gap-2">
              <button
                disabled={archiving}
                onClick={() => setArchiveConfirm(null)}
                className="px-4 py-2 border border-border-custom rounded-md text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={archiving}
                onClick={() => handleArchiveProject(archiveConfirm.id)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {archiving ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Archiving...
                  </>
                ) : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-border-custom">
            <h2 className="mb-2">Delete Project?</h2>
            <p className="text-sm text-muted mb-6">
              This will remove the project from Mission Control. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-border-custom rounded-md text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm"
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
