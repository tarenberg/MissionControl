"use client";

import React, { useState, useEffect } from 'react';
import { getDailyMemoryFileNames, getDailyMemoryContent } from '../app/memory/actions';

const DailyMemoryList: React.FC = () => {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    const fetchFileNames = async () => {
      setLoadingFiles(true);
      const names = await getDailyMemoryFileNames();
      // Sort files by date, newest first
      const sortedNames = names.sort((a, b) => b.localeCompare(a));
      setFileNames(sortedNames);
      if (sortedNames.length > 0) {
        setSelectedFile(sortedNames[0]); // Select the newest file by default
      }
      setLoadingFiles(false);
    };
    fetchFileNames();
  }, []);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (selectedFile) {
        setLoadingContent(true);
        const content = await getDailyMemoryContent(selectedFile);
        setFileContent(content);
        setLoadingContent(false);
      } else {
        setFileContent('');
      }
    };
    fetchFileContent();
  }, [selectedFile]);

  return (
    <div className="neo-flat rounded-[40px] p-10 border border-white/50 dark:border-white/5 h-full flex flex-col shadow-neo-flat overflow-hidden">
      <div className="flex items-center gap-4 mb-8 ml-2">
        <div className="neo-pressed p-3 rounded-2xl text-orange-600 dark:text-orange-400">
           <span className="text-xl neo-glow-orange">📅</span>
        </div>
        <div>
          <h2 className="text-gray-800 dark:text-gray-200 font-black tracking-tighter m-0 uppercase text-sm">Daily Memory</h2>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Chronological Event Stream</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden gap-6">
        {/* File List Sidebar */}
        <div className="w-56 flex flex-col gap-3 overflow-y-auto pr-4 custom-scrollbar">
          {loadingFiles ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Indexing Files...</p>
            </div>
          ) : fileNames.length === 0 ? (
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic text-center py-12">No archives found.</p>
          ) : (
            fileNames.map(name => (
              <button
                key={name}
                onClick={() => setSelectedFile(name)}
                className={`w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedFile === name 
                    ? 'neo-pressed text-orange-600 dark:text-orange-400 shadow-inner' 
                    : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:neo-flat'
                }`}
              >
                {name.replace('.md', '')}
              </button>
            ))
          )}
        </div>

        {/* File Content Display */}
        <div className="flex-1 overflow-y-auto neo-pressed p-8 rounded-[32px] bg-neo-bg text-gray-800 dark:text-gray-300 font-mono text-[11px] leading-relaxed border border-black/10 dark:border-white/5 custom-scrollbar relative">
          {loadingContent ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
               <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
               <p className="text-[10px] font-black uppercase tracking-widest">Opening Archive {selectedFile}...</p>
            </div>
          ) : selectedFile ? (
            <pre className="whitespace-pre-wrap">{fileContent}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-30 italic">
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select a node to begin stream</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyMemoryList;
