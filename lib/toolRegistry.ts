export interface Tool {
  id: string;
  name: string;
  description: string;
}

export const toolRegistry: Tool[] = [
  {
    id: "dashboard-overview",
    name: "Dashboard Overview",
    description: "Provides a summary of key metrics and ongoing tasks.",
  },
  {
    id: "agent-management",
    name: "Agent Management",
    description: "Monitor and control your AI sub-agents.",
  },
  {
    id: "memory-access",
    name: "Memory Access",
    description: "Search and manage the shared knowledge base.",
  },
  {
    id: "project-builder",
    name: "Project Builder",
    description: "Initiate and track new application development.",
  },
];
