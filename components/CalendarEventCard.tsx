'use client';

import React from 'react';
import { CalendarEvent } from '../interfaces/CalendarEvent';

interface CalendarEventCardProps {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
}

const categoryColors: Record<CalendarEvent['category'], string> = {
  'green': 'bg-green-600',
  'red': 'bg-red-600',
  'orange': 'bg-orange-600',
  'blue': 'bg-blue-600',
  'purple': 'bg-purple-600',
  'gray': 'bg-gray-200',
};

const CalendarEventCard: React.FC<CalendarEventCardProps> = ({ event, onSelect }) => {
  const bgColor = categoryColors[event.category] || 'bg-gray-100';

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={`${bgColor} text-gray-900 text-xs p-2 rounded-md mb-1 w-full text-left transition transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-black/40`}
    >
      <p className="font-semibold">{event.title}</p>
      <p className="text-xxs opacity-80">{event.time}</p>
    </button>
  );
};

export default CalendarEventCard;
