export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: 'T' | 'M'; // T for Tom, M for Muffin
  status: 'Recurring' | 'Backlog' | 'In Progress' | 'Review' | 'Done';
  tags?: string[]; // Optional tags like 'YouTube', 'Clawbot', etc.
}
