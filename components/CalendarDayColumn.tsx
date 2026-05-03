'use client';

import React from 'react';
import CalendarEventCard from './CalendarEventCard';
import { CalendarEvent } from '../interfaces/CalendarEvent';

interface CalendarDayColumnProps {
  day: string;
  events: CalendarEvent[];
  onSelect?: (event: CalendarEvent) => void;
}

const CalendarDayColumn: React.FC<CalendarDayColumnProps> = ({ day, events, onSelect }) => {
  return (
    <div className="flex-1 border border-gray-200 rounded-md p-2 min-w-[120px] bg-gray-100/60">
      <h3 className="text-gray-900 font-semibold mb-2">{day}</h3>
      <div>
        {events
          .sort((a, b) => a.time.localeCompare(b.time))
          .map(event => (
            <CalendarEventCard key={event.id} event={event} onSelect={onSelect} />
          ))}
      </div>
    </div>
  );
};

export default CalendarDayColumn;
