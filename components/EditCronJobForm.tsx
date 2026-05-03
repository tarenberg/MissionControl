'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCronJob } from '@/app/ops/edit/actions';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  agentId?: string;
  message?: string;
}

interface Props {
  job: CronJob;
}

export default function EditCronJobForm({ job }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: job.name,
    schedule: job.schedule,
    enabled: job.enabled,
    agentId: job.agentId || '',
    message: job.message || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await updateCronJob(job.id, formData);
      if (result.success) {
        router.push('/ops');
        router.refresh();
      } else {
        setError(result.error || 'Failed to update cron job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-900 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-2">
          Job Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="schedule" className="block text-sm font-medium text-gray-600 mb-2">
          Cron Schedule
        </label>
        <input
          type="text"
          id="schedule"
          name="schedule"
          value={formData.schedule}
          onChange={handleChange}
          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500 font-mono text-sm"
          placeholder="0 4 * * *"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: minute hour day month weekday (e.g., "0 4 * * *" for 4:00 AM daily)
        </p>
      </div>

      <div>
        <label htmlFor="agentId" className="block text-sm font-medium text-gray-600 mb-2">
          Agent ID
        </label>
        <select
          id="agentId"
          name="agentId"
          value={formData.agentId}
          onChange={handleChange}
          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
        >
          <option value="">Default (no specific agent)</option>
          <option value="M">M - Muffin</option>
          <option value="J">J - Coder</option>
          <option value="A">A - Archivist</option>
          <option value="P">P - Pathfinder</option>
          <option value="S">S - Sentinel</option>
          <option value="X">X - Pixels</option>
          <option value="H">H - Housekeeper</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-600 mb-2">
          Message / Command
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500 font-mono text-sm"
          placeholder="Command or message to execute..."
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enabled"
          name="enabled"
          checked={formData.enabled}
          onChange={handleChange}
          className="w-4 h-4 rounded border-gray-200 bg-gray-100 text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="enabled" className="text-sm text-gray-600">
          Enabled
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
        <a
          href="/ops"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
