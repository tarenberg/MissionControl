export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  dayOfWeek: string[]; // e.g., ["Mon", "Tue"]
  frequency: 'Recurring' | 'Daily' | 'Weekly' | 'Monthly';
  category: 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gray';
  isCron?: boolean;
}
