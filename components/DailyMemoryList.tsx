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
    <div className="bg-card p-4 rounded-3xl shadow-xl border border-border-custom h-full flex flex-col interactive-card">
      <h2 className="mb-4">Daily Memory (memory/YYYY-MM-DD.md)</h2>
      <div className="flex-1 flex overflow-hidden">
        {/* File List Sidebar */}
        <div className="w-48 overflow-y-auto pr-3 border-r border-border-custom mr-3">
          {loadingFiles ? (
            <p className="text-muted">Loading daily files...</p>
          ) : fileNames.length === 0 ? (
            <p className="text-muted">No daily memory files found.</p>
          ) : (
            <ul>
              {fileNames.map(name => (
                <li key={name} className="mb-1">
                  <button
                    onClick={() => setSelectedFile(name)}
                    className={`block w-full text-left p-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${selectedFile === name ? 'bg-blue-600 text-white shadow-lg' : 'text-muted hover:bg-background'}`}
                  >
                    {name.replace('.md', '')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* File Content Display */}
        <div className="flex-1 overflow-y-auto bg-background p-3 rounded-xl text-foreground font-mono text-sm border border-border-custom">
          {loadingContent ? (
            <p>Loading content for {selectedFile}...</p>
          ) : selectedFile ? (
            <pre className="whitespace-pre-wrap">{fileContent}</pre>
          ) : (
            <p className="text-muted">Select a daily memory file to view its content.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyMemoryList;
