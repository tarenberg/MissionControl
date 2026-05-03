export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'Active' | 'Planning' | 'Archived';
  importance: 'High' | 'Medium' | 'Low';
  progress: number;
  lastWorkedOn: string;
  lastAgent: string;
  sourcePath: string;
  createdAt: string;
  groups?: string[];
  launchUrl?: string;
  repoUrl?: string;
}
