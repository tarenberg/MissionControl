import React from 'react';
import AgentCard from './AgentCard';
import { AgentData } from '@/interfaces/Agent';

interface AgentOrgChartProps {
  agents: AgentData[];
}

const AgentOrgChart: React.FC<AgentOrgChartProps> = ({ agents }) => {
  const getDirectReports = (agentName: string) => {
    return agents.filter(agent => agent.reportsTo === agentName);
  };

  const renderAgentBranch = (agent: AgentData, level: number = 0) => {
    const directReports = getDirectReports(agent.name);

    return (
      <div className="flex flex-col items-center relative py-4">
        {/* Render the current agent */}
        <div className={`mb-4 ${level > 0 ? 'mt-8' : ''}`}> {/* Add margin-top for non-root agents */}
          <AgentCard {...agent} />
        </div>

        {directReports.length > 0 && (
          <div className="flex justify-center gap-8 w-full relative">
            {/* Horizontal line connecting direct reports */}
            {directReports.length > 1 && (
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 -z-10"></div>
            )}
            {directReports.map((report, index) => (
              <div key={report.name} className="flex flex-col items-center">
                {/* Vertical line from current agent to direct report */}
                <div className="w-0.5 h-8 bg-gray-300"></div>
                {renderAgentBranch(report, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const muffin = agents.find(agent => agent.name === 'Muffin');

  if (!muffin) {
    return <div className="text-red-500 text-center">Error: Muffin (AI Familiar / Coordinator) not found in agents data.</div>;
  }

  return (
    <div className="p-4 bg-white text-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center">OpenClaw Operational Agents</h1>

      {/* Input Signal */}
      <div className="text-center text-gray-500 mb-8">
        <p className="text-lg font-semibold">[INPUT SIGNAL] (From User)</p>
        <div className="w-0.5 h-8 bg-purple-500 mx-auto my-2"></div>
      </div>

      {/* Render Muffin and subsequent branches */}
      {renderAgentBranch(muffin)}

      {/* Output Action */}
      <div className="text-center text-gray-500 mt-16">
        <div className="w-0.5 h-8 bg-red-500 mx-auto my-2"></div>
        <p className="text-lg font-semibold">[OUTPUT ACTION] (To User)</p>
      </div>
    </div>
  );
};

export default AgentOrgChart;
