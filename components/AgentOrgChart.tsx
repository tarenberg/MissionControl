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
        <div className={`mb-4 ${level > 0 ? 'mt-4' : ''} z-10`}>
          <AgentCard {...agent} />
        </div>

        {directReports.length > 0 && (
          <div className="flex justify-center gap-12 w-full relative pt-8">
            {/* Horizontal bridge line */}
            {directReports.length > 1 && (
              <div className="absolute top-0 left-[15%] right-[15%] h-1 bg-white/40 rounded-full shadow-[2px_2px_4px_#b8bec5,-2px_-2px_4px_#ffffff]"></div>
            )}
            
            {directReports.map((report, index) => (
              <div key={report.name} className="flex flex-col items-center relative">
                {/* Vertical drop line */}
                <div className="absolute -top-8 w-1 h-8 bg-white/40 rounded-full shadow-[1px_1px_2px_#b8bec5,-1px_-1px_2px_#ffffff]"></div>
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
    <div className="p-8 bg-[#e0e5ec] text-gray-900 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-12 text-center text-4xl font-black text-gray-700 tracking-tighter uppercase italic">
          Operational Hierarchy
        </h1>

        {/* Input Signal */}
        <div className="flex flex-col items-center mb-12">
          <div className="neo-pressed px-4 py-2 rounded-2xl">
            <p className="text-xs font-bold text-purple-600 tracking-widest uppercase">[ INPUT SIGNAL ]</p>
          </div>
          <div className="w-1 h-12 bg-gradient-to-b from-purple-500 to-gray-300 rounded-full my-2 shadow-[0_0_10px_rgba(168,85,247,0.3)]"></div>
        </div>

        {/* Render Muffin and subsequent branches */}
        <div className="flex justify-center overflow-x-auto pb-20">
          {renderAgentBranch(muffin)}
        </div>

        {/* Output Action */}
        <div className="flex flex-col items-center mt-12">
          <div className="w-1 h-12 bg-gradient-to-b from-gray-300 to-red-500 rounded-full my-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]"></div>
          <div className="neo-pressed px-4 py-2 rounded-2xl">
            <p className="text-xs font-bold text-red-600 tracking-widest uppercase">[ OUTPUT ACTION ]</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentOrgChart;
