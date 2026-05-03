import React from 'react';
import { CalendarEvent } from '../interfaces/CalendarEvent';
import { readFileSync } from 'fs';
import path from 'path';
import CalendarInteractive from './CalendarInteractive';

const MissionControlCalendar: React.FC = () => {
  const calendarFilePath = path.join(process.cwd(), 'data', 'calendar.json');
  let allEvents: CalendarEvent[] = [];

  try {
    const calendarJson = readFileSync(calendarFilePath, 'utf-8');
    allEvents = JSON.parse(calendarJson);
  } catch (error) {
    console.error('Failed to load calendar events from data/calendar.json:', error);
  }

  const alwaysRunning = [
    { title: 'Playbook Scanner', frequency: '4x daily' },
    { title: 'Opportunity Scanner', frequency: '2x daily' },
    { title: 'Competitor Scanner', frequency: '2x daily' },
  ];

  const nextUp = [
    { title: 'Reaction Poller', eta: 'in 30 min' },
    { title: 'Playbook Scanner', eta: 'in 2 hours' },
  ];

  return (
    <CalendarInteractive events={allEvents} alwaysRunning={alwaysRunning} nextUp={nextUp} />
  );
};

export default MissionControlCalendar;
