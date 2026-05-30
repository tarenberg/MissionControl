'use client';

import React, { useMemo, useState } from 'react';
import CalendarDayColumn from './CalendarDayColumn';
import AlwaysRunningSection from './AlwaysRunningSection';
import NextUpSection from './NextUpSection';
import { CalendarEvent } from '../interfaces/CalendarEvent';

interface CalendarInteractiveProps {
  events: CalendarEvent[];
  alwaysRunning: { title: string; frequency: string }[];
  nextUp: { title: string; eta: string }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const descriptions: Record<string, string> = {
  'Morning Kickoff': 'Daily agent briefing and task coordination. Reviews overnight activity and sets priorities for the day.',
  'Trend Radar Daily Digest': 'Compiles and delivers research findings, technology trends, and industry updates.',
  'Evening Wrap Up': 'End-of-day summary generation. Documents completed tasks and prepares for next day.',
  'Memory Summaries': 'Processes daily memory files and generates AI-powered summaries of key decisions, projects, and lessons learned.',
  'Ensure Daily Memory': 'Creates the daily memory file if it does not exist, ensuring continuity of daily logging.',
  'Heartbeat Check': 'Monitors system health by checking HEARTBEAT.md freshness. Alerts if no activity detected in 30+ minutes.',
  'YouTube OpenClaw': 'Scheduled content creation and publishing for the OpenClaw channel.',
  'Scout Morning Res...': 'Scout’s morning research block: gather intel, scan feeds, and surface opportunities.',
  'Scout Morning Research': 'Scout’s morning research block: gather intel, scan feeds, and surface opportunities.',
  'Morning Brief': 'Quick morning status update and briefing for the day ahead.',
  'Quill Script Writer': 'Automated script writing and content generation for documentation or presentations.',
  'Daily Digest': 'Compilation of daily activities, notifications, and important updates.',
  'Stock Scarcity Res...': 'Weekly research on stock availability, scarcity trends, and supply chain updates.',
  'Weekly Newsletter': 'End-of-week newsletter compilation with highlights, updates, and upcoming events.',
};

const CalendarInteractive: React.FC<CalendarInteractiveProps> = ({ events, alwaysRunning, nextUp }) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const eventsByDay = useMemo(() => {
    return DAYS.reduce<Record<string, CalendarEvent[]>>((acc, day) => {
      acc[day] = events.filter((event) => event.dayOfWeek.includes(day));
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
  }, [events]);

  const getDescription = (event: CalendarEvent) => {
    return descriptions[event.title] || (event.isCron ? 'Automated scheduled task.' : 'Scheduled calendar event.');
  };

  return (
    <div className="relative flex flex-col p-4 bg-white text-gray-900 min-h-screen">
      <AlwaysRunningSection runningTasks={alwaysRunning} />

      <div className="flex-grow overflow-x-auto">
        <div className={`flex flex-grow gap-2 mt-4 transition-all duration-300 min-w-[700px] ${selectedEvent ? 'mr-80' : ''}`}>
          {DAYS.map((day) => (
            <CalendarDayColumn
              key={day}
              day={day}
              events={eventsByDay[day] || []}
              onSelect={setSelectedEvent}
            />
          ))}
        </div>
      </div>

      <NextUpSection nextUpTasks={nextUp} />

      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ${selectedEvent ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-5 h-full flex flex-col">
          {selectedEvent ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{selectedEvent.frequency}</p>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-500 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-900">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Scheduled Time</p>
                  <p className="text-base">{selectedEvent.time}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Days</p>
                  <p>{selectedEvent.dayOfWeek.join(', ')}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Description</p>
                  <p className="leading-relaxed text-gray-600">{getDescription(selectedEvent)}</p>
                </div>
                {selectedEvent.isCron && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">Automation</p>
                    <p>This entry is tied to an automated cron job.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Select an event to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarInteractive;
