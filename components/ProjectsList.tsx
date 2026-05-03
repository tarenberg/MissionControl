import React from 'react';
import ProjectCard from './ProjectCard';
import { Project } from '../interfaces/Project';

interface ProjectsListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
}

const ProjectsList: React.FC<ProjectsListProps> = ({ projects, onEdit, onDelete, onArchive }) => {
  if (projects.length === 0) {
    return <p className="text-gray-400 text-center mt-8">No projects found. Start by adding a new one!</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map(project => (
        <ProjectCard 
          key={project.id} 
          project={project} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          onArchive={onArchive} 
        />
      ))}
    </div>
  );
};

export default ProjectsList;
