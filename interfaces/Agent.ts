export interface AgentData {
  id: string;
  name: string;
  description: string;
  status: string;
  role: string;
  tags: string[];
  lastHeartbeat?: string;
  model?: string;
  sessions?: any[];
  reportsTo?: string;
}
