"use client";

import React, { useState, useEffect } from 'react';
// Removed direct import of getActivityLog from @/lib/opsControlData
import { ActivityLogEntry } from '../app/api/live-activities/route'; // Import the type from the new API route

const LiveActivities: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/live-activities');
        const data: ActivityLogEntry[] = await response.json();
        // Convert ISO string back to Date objects
        const parsedActivities = data.map(activity => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        }));
        setActivities(parsedActivities.slice(0, 6)); // Limit to 6 as before
      } catch (error) {
        console.error('Failed to fetch live activities:', error);
      }
    };

    fetchActivities();
    const intervalId = setInterval(fetchActivities, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-64 bg-white rounded-lg p-4 shadow-xl border border-gray-200">
      <h2 className="text-gray-900 text-xl font-bold mb-4">Live Activity</h2>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {activities.length === 0 && (
          <p className="text-gray-500 text-sm">No recent activity recorded.</p>
        )}
        {activities.map((item) => (
          <div key={item.id} className="p-2 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{item.type}</p>
            <p className="text-sm text-gray-900 font-semibold">{item.jobName}</p>
            <p className="text-gray-600 text-xs mt-1">{item.message}</p>
            <p className="text-gray-500 text-xxs mt-1">{item.timestamp.toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveActivities;
