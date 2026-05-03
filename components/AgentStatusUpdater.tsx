'use client';

import React, { useState, useEffect } from 'react';
import AgentOrgChart from './AgentOrgChart'; // Ensure this path is correct
import { AgentData } from '@/interfaces/Agent';

interface AgentStatusUpdaterProps {
  initialAgents: AgentData[];
  apiUrl: string;
}

const AgentStatusUpdater: React.FC<AgentStatusUpdaterProps> = ({ initialAgents, apiUrl }) => {
  const [agents, setAgents] = useState<AgentData[]>(initialAgents);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Update agents with fetched status if agent ID matches
        setAgents(prevAgents => prevAgents.map(prevAgent => {
          const fetchedAgent = data.find((fa: AgentData) => fa.id === prevAgent.id);
          return fetchedAgent ? { ...prevAgent, status: fetchedAgent.status } : prevAgent;
        }));

      } catch (error) {
        console.error("Failed to fetch agent status:", error);
      }
    };

    const interval = setInterval(fetchAgentStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <div className="w-full flex justify-center">
      <AgentOrgChart agents={agents} />
    </div>
  );
};

export default AgentStatusUpdater;
