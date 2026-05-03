"use client";

import React, { useState, useEffect } from 'react';
import { Project } from '../interfaces/Project';

interface ProjectFormProps {
  project?: Project; // Optional: for editing existing projects
  onSave: (project: Omit<Project, 'id' | 'createdAt'> | Project) => void | Promise<void>;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Project, 'id' | 'createdAt'> | Project>(project || {
    title: '',
    description: '',
    status: 'Planning',
    importance: 'Medium',
    progress: 0,
    lastWorkedOn: new Date().toISOString(),
    lastAgent: 'Unassigned',
    sourcePath: '',
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    }
  }, [project]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'progress' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{project ? 'Edit Project' : 'Add New Project'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-600">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-600">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              required
            ></textarea>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-600">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div>
            <label htmlFor="importance" className="block text-sm font-medium text-gray-600">Importance</label>
            <select
              id="importance"
              name="importance"
              value={formData.importance}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          {formData.status === 'Active' && (
            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-gray-600">Progress (%)</label>
              <input
                type="number"
                id="progress"
                name="progress"
                value={formData.progress}
                onChange={handleChange}
                min={0}
                max={100}
                className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="lastAgent" className="block text-sm font-medium text-gray-600">Last Agent</label>
            <input
              type="text"
              id="lastAgent"
              name="lastAgent"
              value={formData.lastAgent}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="sourcePath" className="block text-sm font-medium text-gray-600">Source Path</label>
            <input
              type="text"
              id="sourcePath"
              name="sourcePath"
              value={formData.sourcePath}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {project ? 'Save Changes' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
