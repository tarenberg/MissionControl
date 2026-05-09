import React from 'react';
import { Project } from '../interfaces/Project';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  additionalGroups?: string[];
  groupLabelMap?: Record<string, string>;
  onSelect?: (project: Project) => void;
}

const importanceColors: Record<Project['importance'], string> = {
  'High': 'bg-red-600',
  'Medium': 'bg-yellow-600',
  'Low': 'bg-green-600',
};

const statusColors: Record<Project['status'], string> = {
  'Active': 'bg-green-500',
  'Planning': 'bg-blue-500',
  'Archived': 'bg-gray-200',
};

const buildSourceLink = (sourcePath: string) => {
  if (!sourcePath) return null;
  if (/^https?:\/\//i.test(sourcePath) || /^file:\/\//i.test(sourcePath)) {
    return sourcePath;
  }
  const normalized = sourcePath.replace(/\\/g, '/');
  return `file:///${normalized}`;
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete, onArchive, additionalGroups = [], groupLabelMap = {}, onSelect }) => {
  const importanceColor = importanceColors[project.importance];
  const statusColor = statusColors[project.status];
  const fallbackLink = buildSourceLink(project.sourcePath);
  const projectLink = project.launchUrl || fallbackLink;

  const handleOpenProject = () => {
    if (projectLink) {
      window.open(projectLink, '_blank');
    }
  };

  return (
    <div className="neo-flat rounded-[32px] p-6 shadow-neo-flat flex flex-col justify-between border border-white/50 dark:border-white/5 transition-all hover:scale-[1.01] group">
      <div>
        {additionalGroups.length > 0 && (
          <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"></span>
            Also in: {additionalGroups.map(group => groupLabelMap[group] || group).join(', ')}
          </div>
        )}
        <button
          className="text-left w-full text-xl font-black text-gray-800 dark:text-gray-200 mb-3 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none tracking-tight uppercase"
          onClick={handleOpenProject}
          disabled={!projectLink}
          title={projectLink ? 'Open project source' : 'No launch path available'}
        >
          {project.title}
        </button>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-5 line-clamp-3 leading-relaxed">{project.description}</p>

        {project.status === 'Active' && (
          <div className="w-full neo-pressed rounded-full h-3 mb-6 p-[2px]">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-1000"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <span className={`neo-pressed ${statusColor.replace('bg-', 'text-')} px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`}></span>
            {project.status}
          </span>
          <span className={`neo-pressed ${importanceColor.replace('bg-', 'text-')} px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
             <span className={`w-1.5 h-1.5 rounded-full ${importanceColor}`}></span>
            {project.importance}
          </span>
        </div>

        <div className="space-y-2 mb-2">
          <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
            Last activity: <span className="text-gray-600 dark:text-gray-400">{project.lastWorkedOn ? new Date(project.lastWorkedOn).toLocaleDateString() : 'N/A'}</span>
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
            Agent: <span className="text-gray-600 dark:text-gray-400">{project.lastAgent}</span>
          </p>
        </div>

        {project.repoUrl && (
          <div className="mt-4 pt-4 border-t border-gray-300/30 dark:border-gray-700/30">
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline">
              GitHub Repository →
            </a>
          </div>
        )}
      </div>

      {(onEdit || onDelete || onArchive || onSelect) && (
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-300/30 dark:border-gray-700/30">
          {onSelect && (
            <button 
              onClick={() => onSelect(project)} 
              className="neo-button no-3d text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-purple-600 dark:text-purple-400 active:neo-button-active"
            >
              Select
            </button>
          )}
          {onEdit && (
            <button 
              onClick={() => onEdit(project)} 
              className="neo-button no-3d text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-blue-600 dark:text-blue-400 active:neo-button-active"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(project.id)} 
              className="neo-button no-3d text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-red-600 dark:text-red-400 active:neo-button-active"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
