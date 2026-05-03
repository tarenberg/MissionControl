"use client";

import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './Toast';
import {
  listDirectoryContents,
  getFileContent,
  createDirectory,
  createFile,
  deleteFileOrDirectory,
  moveFileOrDirectory,
  updateFileContent,
  generateFilenameFromContent,
  ensureUniqueFilename,
  fetchAndExtractUrl,
  searchDocuments,
} from '../app/docs/actions';

interface FileSystemItem {
  name: string;
  isFolder: boolean;
  path: string;
  source?: 'docs' | 'memory' | 'root' | 'projects' | 'tasks' | 'scripts' | 'skills';
  lastModified?: string;
  size?: number;
}

const normalizePath = (pathStr: string): string => {
  if (!pathStr || pathStr === '.' || pathStr === './') return '/';
  let normalized = pathStr.replace(/\\/g, '/');
  normalized = normalized.replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (normalized !== '/' && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized || '/';
};

const getParentPath = (pathStr: string): string => {
  const normalized = normalizePath(pathStr);
  if (normalized === '/' || normalized === '') return '/';
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
};

const renderMarkdown = (markdown: string) => {
  if (!markdown) return '';
  
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-md my-2 overflow-x-auto"><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>');

  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 border-b pb-2">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-5 mb-3 border-b pb-1">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Checkboxes
  html = html.replace(/^- \[ \] (.*$)/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="rounded border-gray-300"> <span>$1</span></div>');
  html = html.replace(/^- \[x\] (.*$)/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="rounded border-blue-500 text-blue-500"> <span class="line-through text-gray-500">$1</span></div>');

  // Lists
  html = html.replace(/^- (?!\[ [x ]\])(.*$)/gm, '<li class="ml-4 list-disc my-1">$1</li>');

  // Paragraphs (naive)
  html = html.replace(/^\s*$/gm, '<br/>');

  return html;
};

const DocsBrowserContent: React.FC = () => {
  const { addToast } = useToast();
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize path from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathParam = params.get('path');
    if (pathParam) {
      const normalized = normalizePath(pathParam);
      // Check if it's likely a file (has an extension)
      if (normalized.includes('.')) {
        const parent = getParentPath(normalized);
        setCurrentPath(parent);
        // We'll need to fetch the file content specifically once the parent is loaded
        // or just trigger the click logic
        handleItemClick({
          name: normalized.split('/').pop() || '',
          isFolder: false,
          path: normalized
        });
      } else {
        setCurrentPath(normalized);
      }
    }
  }, []);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [showMoveModal, setShowMoveModal] = useState<FileSystemItem | null>(null);
  const [moveToPath, setMoveToPath] = useState('');
  const [moveBrowsePath, setMoveBrowsePath] = useState<string>('/');
  const [moveBrowseItems, setMoveBrowseItems] = useState<FileSystemItem[]>([]);
  const [moveBrowseLoading, setMoveBrowseLoading] = useState(false);

  useEffect(() => {
    if (showMoveModal) {
      setMoveBrowsePath(getParentPath(showMoveModal.path));
      setMoveToPath(showMoveModal.path);
    }
  }, [showMoveModal]);

  useEffect(() => {
    if (showMoveModal) {
      const fetchMoveBrowseItems = async () => {
        setMoveBrowseLoading(true);
        try {
          const contents = await listDirectoryContents(moveBrowsePath);
          setMoveBrowseItems(contents.filter(item => item.isFolder));
        } catch (error) {
          console.error('Failed to load move browse contents:', error);
        }
        setMoveBrowseLoading(false);
      };
      fetchMoveBrowseItems();
    }
  }, [moveBrowsePath, showMoveModal]);

  const handleMoveBrowseClick = (path: string) => {
    const newPath = normalizePath(path);
    setMoveBrowsePath(newPath);
    if (showMoveModal) {
      setMoveToPath(normalizePath(`${newPath}/${showMoveModal.name}`));
    }
  };

  const handleMoveBrowseBack = () => {
    const parent = getParentPath(moveBrowsePath);
    setMoveBrowsePath(parent);
    if (showMoveModal) {
      setMoveToPath(normalizePath(`${parent}/${showMoveModal.name}`));
    }
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFileContent, setEditingFileContent] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importPreviewContent, setImportPreviewContent] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchContents = async () => {
    setLoading(true);
    setSelectedFileContent(null);
    setSelectedFileName(null);
    setSelectedFilePath(null);
    setIsSearching(false);
    try {
      const contents = await listDirectoryContents(currentPath === '/' ? '/' : currentPath);
      const sorted = contents.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      setItems(sorted);
    } catch (error) {
        addToast('Failed to load directory contents.', 'error');
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchContents();
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const results = await searchDocuments(searchQuery);
      setItems(results);
      if (results.length === 0) {
        addToast('No documents found matching your search.', 'info');
      }
    } catch (error) {
      addToast('Search failed.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContents();
  }, [currentPath]);

  const handleItemClick = async (item: FileSystemItem) => {
    if (item.isFolder) {
      setCurrentPath(normalizePath(item.path));
    } else {
      setSelectedFileName(item.name);
      setSelectedFilePath(item.path);
      try {
        const content = await getFileContent(item.path);
        setSelectedFileContent(content);
        setEditingFileContent(content);
      } catch (error) {
        addToast('Failed to load file content.', 'error');
      }
    }
  };

  const handleBackClick = () => {
    setSelectedFileContent(null);
    setSelectedFileName(null);
    setSelectedFilePath(null);
    setCurrentPath(getParentPath(currentPath));
  };

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const templates: Record<string, string> = {
    'Project Spec': `# Spec: [Project Name]\n\n## 📋 Overview\n[Brief description of what we are building]\n\n## 🎯 Requirements\n- [ ] Requirement 1\n- [ ] Requirement 2\n\n## ⚠️ Constraints\n- Constraint 1\n\n## ✅ Acceptance Criteria\n- [ ] Criteria 1\n`,
    'Project Plan': `# Plan: [Feature Name]\n\n## 📂 Target Files\n- \`path/to/file.ts\`\n\n## 📝 Pseudocode / Approach\n1. Step one...\n\n## 🔗 Dependencies\n- Dependency 1\n`,
    'Task List': `# Tasks: [Project Name]\n\n## 🛠️ Implementation Steps\n- [ ] Task 1\n- [ ] Task 2\n\n## 🧪 Verification\n- [ ] Test scenario 1\n`,
    'Meeting Notes': `# Meeting: [Topic] - ${new Date().toLocaleDateString()}\n\n## 👥 Participants\n- Tom, Muffin\n\n## 🗒️ Agenda\n- item 1\n\n## ✅ Action Items\n- [ ] @tom item 1\n- [ ] @muffin item 2\n`,
    'Daily Log': `# Log: ${new Date().toLocaleDateString()}\n\n## ☀️ Morning Kickoff\n- Goal 1\n\n## 🚧 Progress\n- Update 1\n\n## 🌙 Evening Wrap-up\n- Result 1\n`
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    setSelectedTemplate(templateName);
    if (templateName && templates[templateName]) {
      setNewFileContent(templates[templateName]);
      // Also try to suggest a filename if it's empty
      if (!newItemName) {
        const sanitizedName = templateName.toLowerCase().replace(/\s+/g, '-');
        setNewItemName(`${sanitizedName}.md`);
      }
    }
  };

  const handleCreateNew = async () => {
    if (!newItemName.trim()) return;

    if (showCreateModal === 'folder') {
      const success = await createDirectory(currentPath === '/' ? '/' : currentPath, newItemName);
      if (success) {
        setNewItemName('');
        setShowCreateModal(null);
        fetchContents();
        addToast('Folder created successfully.', 'success');
      } else {
        addToast('Failed to create folder.', 'error');
      }
    } else if (showCreateModal === 'file') {
      const success = await createFile(currentPath === '/' ? '/' : currentPath, newItemName, newFileContent);
      if (success) {
        setNewItemName('');
        setNewFileContent('');
        setSelectedTemplate('');
        setShowCreateModal(null);
        fetchContents();
        addToast('File created successfully.', 'success');
      } else {
        addToast('Failed to create file.', 'error');
      }
    }
  };

  const handleDelete = async (item: FileSystemItem) => {
    if (confirm(`Delete ${item.name}${item.isFolder ? ' and its contents' : ''}?`)) {
      const success = await deleteFileOrDirectory(item.path);
      if (success) {
        fetchContents();
        addToast('Item deleted successfully.', 'success');
      }
      else addToast('Failed to delete item.', 'error');
    }
  };

  const handleMove = async () => {
    if (!showMoveModal || !moveToPath.trim()) return;
    const normalizedDestination = normalizePath(moveToPath);
    const success = await moveFileOrDirectory(showMoveModal.path, normalizedDestination);
    if (success) {
      setMoveToPath('');
      setShowMoveModal(null);
      fetchContents();
      addToast('Item moved successfully.', 'success');
    } else {
      addToast('Failed to move item.', 'error');
    }
  };

  const handleUpdateFile = async () => {
    if (!selectedFilePath) return;
    const success = await updateFileContent(selectedFilePath, editingFileContent);
    if (success) {
      setSelectedFileContent(editingFileContent);
      setShowEditModal(false);
      addToast('File updated successfully.', 'success');
    } else {
      addToast('Failed to update file.', 'error');
    }
  };

  const handlePaste = async () => {
    if (!pasteContent.trim()) return;
    try {
      const generatedName = await generateFilenameFromContent(pasteContent, 'paste');
      const uniqueName = await ensureUniqueFilename(currentPath, generatedName);
      const success = await createFile(currentPath, uniqueName, pasteContent);

      if (success) {
        setPasteContent('');
        setShowPasteModal(false);
        fetchContents();
        addToast('Pasted content saved successfully.', 'success');
      } else {
        addToast('Failed to save pasted content.', 'error');
      }
    } catch (error) {
      addToast('An error occurred while saving pasted content.', 'error');
    }
  };

  const handleFetchPreview = async () => {
    if (!importUrl.trim()) return;
    setIsFetching(true);
    try {
      const content = await fetchAndExtractUrl(importUrl);
      setImportPreviewContent(content);
      addToast('Content fetched successfully.', 'info');
    } catch (error) {
      addToast('Failed to fetch content from URL.', 'error');
    }
    setIsFetching(false);
  };

  const handleImport = async () => {
    if (!importPreviewContent.trim()) return;
    try {
      const generatedName = await generateFilenameFromContent(importPreviewContent, 'imported');
      const uniqueName = await ensureUniqueFilename(currentPath, generatedName);
      const success = await createFile(currentPath, uniqueName, importPreviewContent);

      if (success) {
        setImportUrl('');
        setImportPreviewContent('');
        setShowImportModal(false);
        fetchContents();
        addToast('Imported content saved successfully.', 'success');
      } else {
        addToast('Failed to save imported content.', 'error');
      }
    } catch (error) {
      addToast('An error occurred while saving imported content.', 'error');
    }
  };

  const currentPathDisplay = currentPath === '/' ? 'workspace/' : `workspace${currentPath}/`;

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 rounded-lg shadow-xl p-4">
      <h1 className="text-3xl font-bold mb-6">Docs</h1>

      <div className="flex items-center justify-between mb-4 bg-gray-100 p-3 rounded-md">
        <div className="flex items-center overflow-hidden flex-grow mr-4">
          {currentPath !== '/' && !isSearching && (
            <button onClick={handleBackClick} className="mr-3 p-1 rounded-full hover:bg-gray-200 flex-shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
          )}
          {isSearching ? (
            <div className="flex items-center text-gray-600 font-mono text-sm">
              <button onClick={() => { setSearchQuery(''); fetchContents(); }} className="mr-2 text-blue-600 hover:underline">Exit Search</button>
              <span className="mx-2 text-gray-400">/</span>
              <span>Search results for "{searchQuery}"</span>
            </div>
          ) : (
            <nav className="flex text-gray-600 font-mono text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
              <button 
                onClick={() => setCurrentPath('/')}
                className="hover:text-blue-600 hover:underline"
              >
                workspace
              </button>
              {currentPath.split('/').filter(Boolean).map((part, index, array) => {
                const path = `/${array.slice(0, index + 1).join('/')}`;
                return (
                  <React.Fragment key={path}>
                    <span className="mx-2 text-gray-400">/</span>
                    <button 
                      onClick={() => setCurrentPath(path)}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>
        <form onSubmit={handleSearch} className="flex-shrink-0 mr-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-8 pr-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-64"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </form>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setShowCreateModal('folder')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md">New Folder</button>
          <button onClick={() => setShowCreateModal('file')} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-md">New File</button>
          <button onClick={() => setShowPasteModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded-md">Paste Text</button>
          <button onClick={() => setShowImportModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-3 py-1 rounded-md">Import URL</button>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        <div className={`flex-shrink-0 overflow-y-auto pr-4 ${selectedFileContent ? 'w-1/2 border-r border-gray-200 mr-4' : 'w-full'}`}>
          {loading ? (
            <p className="text-gray-400">Loading contents...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-400">This folder is empty.</p>
          ) : (
            <ul>
              {items.map(item => (
                <li key={item.path} className="mb-2 flex justify-between items-center">
                  <button onClick={() => handleItemClick(item)} className="flex items-center text-left flex-grow p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <span className="mr-2 text-gray-500">
                      {item.isFolder ? (
                        item.source === 'projects' ? (
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                        ) : item.source === 'tasks' ? (
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        ) : item.source === 'scripts' ? (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        ) : item.source === 'skills' ? (
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.183.244l-.28.172a2 2 0 00-.713 2.534 2 2 0 002.713.62l.285-.174a2 2 0 011.183-.244l2.356.413a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.357.413a2 2 0 001.183-.244l.28-.172a2 2 0 00.713-2.534 2 2 0 00-2.713-.62l-.285.174zM12 7V3m4.243 4.243L19.071 4.414M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.183.244l-.28.172a2 2 0 00-.713 2.534 2 2 0 002.713.62l.285-.174a2 2 0 011.183-.244l2.356.413a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.357.413a2 2 0 001.183-.244l.28-.172a2 2 0 00.713-2.534 2 2 0 00-2.713-.62l-.285.174z"></path></svg>
                        ) : item.source === 'memory' ? (
                          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                        )
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      )}
                    </span>
                    <span className="text-gray-800">{item.name}</span>
                    {item.size !== undefined && <span className="ml-auto text-gray-500 text-xs">{Math.ceil(item.size / 1024) || 1} KB</span>}
                  </button>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => setShowMoveModal(item)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400" title="Move">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-4l-4 4m0 0l4 4m-4-4h14"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(item)} className="p-1 rounded-full hover:bg-gray-100 text-red-500" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedFileContent && (
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-md text-gray-800 border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h3 className="text-xl font-bold text-gray-900">{selectedFileName}</h3>
              <button onClick={() => setShowEditModal(true)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-4 py-1.5 rounded-md shadow-sm transition-colors">Edit</button>
            </div>
            <div 
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFileContent) }}
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New {showCreateModal === 'folder' ? 'Folder' : 'File'}</h2>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={showCreateModal === 'folder' ? 'Folder Name' : 'File Name (e.g., my-doc.md)'}
              className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 mb-3"
            />
            {showCreateModal === 'file' && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Template (Optional)</label>
                <select
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 mb-3"
                >
                  <option value="">Blank Document</option>
                  {Object.keys(templates).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  placeholder="File content (optional)"
                  rows={6}
                  className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 mb-3"
                ></textarea>
              </>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCreateModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleCreateNew} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Move {showMoveModal.name}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Path</label>
              <input
                type="text"
                value={moveToPath}
                onChange={(e) => setMoveToPath(e.target.value)}
                placeholder="New relative path"
                className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-grow flex flex-col border border-gray-200 rounded-md overflow-hidden bg-gray-50 mb-4">
              <div className="p-2 bg-gray-100 border-b border-gray-200 flex items-center text-xs font-mono text-gray-500">
                <button 
                  onClick={handleMoveBrowseBack}
                  disabled={moveBrowsePath === '/'}
                  className="mr-2 p-1 rounded-full hover:bg-gray-200 disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <span>browse: {moveBrowsePath === '/' ? 'workspace/' : `workspace${moveBrowsePath}/`}</span>
              </div>
              <div className="flex-grow overflow-y-auto p-2">
                {moveBrowseLoading ? (
                  <p className="text-xs text-gray-400">Loading...</p>
                ) : moveBrowseItems.length === 0 ? (
                  <p className="text-xs text-gray-400">No subfolders.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {moveBrowseItems.map(item => (
                      <button
                        key={item.path}
                        onClick={() => handleMoveBrowseClick(item.path)}
                        className="flex items-center text-left p-2 rounded border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                        <span className="text-sm text-gray-700 truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <button onClick={() => setShowMoveModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleMove} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Move</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Editing {selectedFileName}</h2>
            <textarea
              value={editingFileContent}
              onChange={(e) => setEditingFileContent(e.target.value)}
              rows={20}
              className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 mb-3 font-mono"
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleUpdateFile} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {showPasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Paste Text</h2>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste your content here..."
              rows={20}
              className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 mb-3 font-mono"
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowPasteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handlePaste} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Import from URL</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-grow bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
              <button onClick={handleFetchPreview} disabled={isFetching} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                {isFetching ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
            <textarea
              value={importPreviewContent}
              readOnly
              placeholder="Content preview..."
              rows={15}
              className="mt-1 block w-full bg-gray-50 border-gray-200 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 mb-3 font-mono"
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleImport} disabled={!importPreviewContent.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DocsBrowser: React.FC = () => {
  return (
    <ToastProvider>
      <DocsBrowserContent />
    </ToastProvider>
  );
};

export default DocsBrowser;
