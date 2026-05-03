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
    <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col justify-between border border-gray-200">
      <div>
        {additionalGroups.length > 0 && (
          <div className="text-xs text-purple-600 mb-2">
            Also in: {additionalGroups.map(group => groupLabelMap[group] || group).join(', ')}
          </div>
        )}
        <button
          className="text-left w-full text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 focus:outline-none"
          onClick={handleOpenProject}
          disabled={!projectLink}
          title={projectLink ? 'Open project source' : 'No launch path available'}
        >
          {project.title}
        </button>
        <p className="text-gray-500 text-sm mb-3 line-clamp-3">{project.description}</p>

        {project.status === 'Active' && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-500 h-2.5 rounded-full"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs mb-2">
          <span className={`${statusColor} text-gray-900 px-2 py-1 rounded-full`}>
            {project.status}
          </span>
          <span className={`${importanceColor} text-gray-900 px-2 py-1 rounded-full`}>
            {project.importance} Importance
          </span>
        </div>

        <p className="text-gray-500 text-xs mb-2">
          Last worked: {project.lastWorkedOn ? new Date(project.lastWorkedOn).toLocaleDateString() : 'N/A'} by {project.lastAgent}
        </p>

        {project.sourcePath && (
          <p className="text-gray-500 text-xs mb-2 break-all">
            Source: {project.sourcePath}
          </p>
        )}

        {project.repoUrl && (
          <p className="text-xs mb-2">
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
              View GitHub Repo
            </a>
          </p>
        )}
      </div>

      {(onEdit || onDelete || onArchive || onSelect) && (
        <div className="flex justify-end gap-2 mt-4">
          {onSelect && (
            <button 
              onClick={() => onSelect(project)} 
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded-md"
            >
              Select
            </button>
          )}
          {onEdit && (
            <button 
              onClick={() => onEdit(project)} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md"
            >
              Edit
            </button>
          )}
          {onArchive && project.status !== 'Archived' && (
            <button 
              onClick={() => onArchive(project.id)} 
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded-md"
            >
              Archive
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(project.id)} 
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-md"
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
