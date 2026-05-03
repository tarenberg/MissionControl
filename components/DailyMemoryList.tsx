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
    <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Memory (memory/YYYY-MM-DD.md)</h2>
      <div className="flex-1 flex overflow-hidden">
        {/* File List Sidebar */}
        <div className="w-48 overflow-y-auto pr-3 border-r border-gray-200 mr-3">
          {loadingFiles ? (
            <p className="text-gray-500">Loading daily files...</p>
          ) : fileNames.length === 0 ? (
            <p className="text-gray-500">No daily memory files found.</p>
          ) : (
            <ul>
              {fileNames.map(name => (
                <li key={name} className="mb-1">
                  <button
                    onClick={() => setSelectedFile(name)}
                    className={`block w-full text-left p-2 rounded-md ${selectedFile === name ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {name.replace('.md', '')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* File Content Display */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-3 rounded-md text-gray-900 font-mono text-sm">
          {loadingContent ? (
            <p>Loading content for {selectedFile}...</p>
          ) : selectedFile ? (
            <pre className="whitespace-pre-wrap">{fileContent}</pre>
          ) : (
            <p className="text-gray-500">Select a daily memory file to view its content.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyMemoryList;
