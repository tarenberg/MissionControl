import React from 'react';

interface AlwaysRunningSectionProps {
  runningTasks: { title: string; frequency: string; }[];
}

const AlwaysRunningSection: React.FC<AlwaysRunningSectionProps> = ({ runningTasks }) => {
  return (
    <div className="neo-flat rounded-[32px] p-8 mb-12 border border-white/50 dark:border-white/5 shadow-neo-flat">
      <div className="flex items-center gap-3 mb-8 ml-2">
        <div className="neo-pressed p-3 rounded-2xl text-blue-600 dark:text-blue-400">
          <svg className="w-5 h-5 neo-glow-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Always Running</h2>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Persistent background routines</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 px-2">
        {runningTasks.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest italic">
            No persistent routines active.
          </div>
        ) : (
          runningTasks.map((task, index) => (
            <div key={index} className="neo-pressed px-6 py-3 rounded-2xl border border-white/20 dark:border-white/5 flex items-center gap-3 group transition-all hover:neo-flat">
              <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                {task.title}
              </span>
              <div className="h-3 w-[1px] bg-gray-300 dark:bg-gray-700"></div>
              <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                {task.frequency}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlwaysRunningSection;
