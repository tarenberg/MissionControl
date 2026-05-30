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
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-zinc-800 p-3 rounded-md my-2 overflow-x-auto border border-border-custom"><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-zinc-700 px-1 rounded text-sm">$1</code>');

  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-semibold mt-6 mb-4 border-b pb-2">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-5 mb-3 border-b pb-1">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mt-4 mb-2">$1</h3>');

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [isDirty, setIsDirty] = useState(false);

  const getItemIcon = (item: FileSystemItem) => {
    if (!item.isFolder) return '📄';
    
    // Map folder icons based on source or name
    switch (item.source) {
      case 'docs': return '📚';
      case 'memory': return '📅';
      case 'tasks': return '🛠️';
      case 'scripts': return '📜';
      case 'skills': return '🧪';
      case 'projects': return '🏗️';
      default: return '📁';
    }
  };

  // Define handleItemClick first
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

  // Define fetchContents
  const fetchContents = async (isInitializing = false) => {
    setLoading(true);
    if (!isInitializing) {
      setSelectedFileContent(null);
      setSelectedFileName(null);
      setSelectedFilePath(null);
    }
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
    // Check if we are currently initializing from URL to avoid clearing state
    const params = new URLSearchParams(window.location.search);
    const isInitializing = !!params.get('path');
    fetchContents(isInitializing);
  }, [currentPath]);

  // Initialize path from URL if present - Move to after function definitions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathParam = params.get('path');
    if (pathParam) {
      const normalized = normalizePath(pathParam);
      // Check if it's likely a file (has an extension)
      if (normalized.includes('.')) {
        const parent = getParentPath(normalized);
        setCurrentPath(parent);
        // Trigger the click logic after a short delay to ensure state is ready
        setTimeout(() => {
          handleItemClick({
            name: normalized.split('/').pop() || '',
            isFolder: false,
            path: normalized
          });
        }, 100);
      } else {
        setCurrentPath(normalized);
      }
    }
  }, []);

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
      setIsDirty(false);
      addToast('File updated successfully.', 'success');
    } else {
      addToast('Failed to update file.', 'error');
    }
  };

  // Keyboard shortcut for Save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (showEditModal) {
          e.preventDefault();
          handleUpdateFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, editingFileContent, selectedFilePath]);

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
    <div className="flex flex-col h-full bg-card text-foreground rounded-3xl border border-border-custom shadow-xl p-6 transition-all duration-300">
      <h1 className="mb-8">Docs</h1>

      <div className="flex items-center justify-between mb-6 bg-background p-4 rounded-2xl border border-border-custom transition-all">
        <div className="flex items-center overflow-hidden flex-grow mr-4">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex-shrink-0 no-3d transition-colors">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          {currentPath !== '/' && !isSearching && (
            <button onClick={handleBackClick} className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex-shrink-0 no-3d transition-colors">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
          )}
          {isSearching ? (
            <div className="flex items-center text-muted font-mono text-sm">
              <button onClick={() => { setSearchQuery(''); fetchContents(); }} className="mr-2 text-blue-600 dark:text-blue-400 hover:underline no-3d transition-colors">Exit Search</button>
              <span className="mx-2 text-border-custom">/</span>
              <span>Search results for "{searchQuery}"</span>
            </div>
          ) : (
            <nav className="flex text-muted font-mono text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
              <button 
                onClick={() => setCurrentPath('/')}
                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline no-3d transition-colors"
              >
                workspace
              </button>
              {currentPath.split('/').filter(Boolean).map((part, index, array) => {
                const path = `/${array.slice(0, index + 1).join('/')}`;
                return (
                  <React.Fragment key={path}>
                    <span className="mx-2 text-border-custom">/</span>
                    <button 
                      onClick={() => setCurrentPath(path)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline no-3d transition-colors"
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
              id="docs-search"
              name="docs-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-card border border-border-custom rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-muted no-3d hover:text-blue-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <button onClick={() => setShowCreateModal('file')} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all">
          New File
        </button>
        <button onClick={() => setShowCreateModal('folder')} className="bg-card border border-border-custom text-foreground px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">
          New Folder
        </button>
        <button onClick={() => setShowPasteModal(true)} className="bg-card border border-border-custom text-foreground px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">
          Paste content
        </button>
        <button onClick={() => setShowImportModal(true)} className="bg-card border border-border-custom text-foreground px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">
          Import from URL
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block w-1/3 overflow-y-auto pr-4 scrollbar-hide border-r border-border-custom">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-background animate-pulse rounded-2xl border border-border-custom"></div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div 
                  key={item.path} 
                  className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer btn-3d ${
                    selectedFilePath === item.path 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm' 
                      : 'bg-card border-border-custom hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500'
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xl flex-shrink-0">{getItemIcon(item)}</span>
                    <span className={`text-sm font-bold truncate transition-colors ${selectedFilePath === item.path ? 'text-blue-700 dark:text-blue-400' : 'text-foreground group-hover:text-blue-500'}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowMoveModal(item); }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-muted transition-colors no-3d"
                      title="Move"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-muted hover:text-red-500 transition-colors no-3d"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="py-12 text-center text-muted italic text-sm">
                  This folder is empty
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar - Mobile Modal */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <div className="bg-card w-4/5 max-w-sm h-full p-6 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-6">File Browser</h2>
              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-background animate-pulse rounded-2xl border border-border-custom"></div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <div 
                      key={item.path} 
                      className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer btn-3d ${
                        selectedFilePath === item.path 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm' 
                          : 'bg-card border-border-custom hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500'
                      }`}
                      onClick={() => { handleItemClick(item); setIsSidebarOpen(false); }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-xl flex-shrink-0">{getItemIcon(item)}</span>
                        <span className={`text-sm font-bold truncate transition-colors ${selectedFilePath === item.path ? 'text-blue-700 dark:text-blue-400' : 'text-foreground group-hover:text-blue-500'}`}>
                          {item.name}
                        </span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-12 text-center text-muted italic text-sm">
                      This folder is empty
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 w-full md:w-2/3 flex flex-col">
          {selectedFilePath && (
            <div className="flex-1 flex flex-col bg-card/50 rounded-2xl text-foreground border border-border-custom overflow-hidden shadow-inner transition-all duration-300">
              <div className="flex justify-between items-center p-6 border-b border-border-custom bg-card sticky top-0 z-10">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-foreground leading-tight tracking-tight">{selectedFileName}</h3>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest truncate max-w-md">{selectedFilePath}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowEditModal(true)} 
                    className="bg-card border border-border-custom hover:bg-gray-100 dark:hover:bg-zinc-800 text-foreground text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-2xl transition-all active:scale-95"
                  >
                    Edit Document
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {selectedFileContent !== null ? (
                  <div 
                    className="prose prose-blue dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFileContent) }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="italic text-sm">Reading document...</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedFilePath && (
            <div className="flex-1 flex flex-col items-center justify-center bg-background rounded-2xl text-muted border border-dashed border-border-custom">
              <span className="text-4xl mb-4">📂</span>
              <p className="text-sm font-bold uppercase tracking-widest">Select a document to preview</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-6">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-md border border-border-custom">
            <h2 className="text-foreground tracking-tight uppercase tracking-widest text-[11px] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 w-fit mb-4">System</h2>
            <div className="text-lg font-semibold text-foreground mb-6">Create New {showCreateModal === 'file' ? 'File' : 'Folder'}</div>
            
            {showCreateModal === 'file' && (
              <div className="mb-6">
                <label htmlFor="template-select" className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Template</label>
                <select 
                  id="template-select"
                  name="template-select"
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                >
                  <option value="">Blank File</option>
                  {Object.keys(templates).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            <div className="mb-8">
              <label htmlFor="item-name" className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Name</label>
              <input
                id="item-name"
                name="item-name"
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={showCreateModal === 'file' ? 'filename.md' : 'Folder name'}
                className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowCreateModal(null)} className="px-6 py-3 text-sm font-bold text-muted hover:text-foreground no-3d transition-colors">Cancel</button>
              <button 
                onClick={handleCreateNew}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-6">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-5xl border border-border-custom flex flex-col h-[85vh] transition-all">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h2 className="text-foreground tracking-tight uppercase tracking-widest text-[11px] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 w-fit mb-2">Editor</h2>
                <div className="text-2xl font-black text-foreground">Editing {selectedFileName}</div>
              </div>
              <div className="flex items-center gap-4">
                {isDirty && <span className="text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800 uppercase tracking-widest animate-pulse">Unsaved Changes</span>}
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Ctrl+S to Save</span>
              </div>
            </div>
            <textarea
              id="edit-content"
              name="edit-content"
              value={editingFileContent}
              onChange={(e) => {
                setEditingFileContent(e.target.value);
                setIsDirty(true);
              }}
              className="flex-1 block w-full bg-background border border-border-custom rounded-2xl shadow-inner text-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-transparent mb-6 p-8 font-mono text-sm resize-none scrollbar-hide"
              placeholder="Start writing..."
              autoFocus
            ></textarea>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => {
                  if (isDirty && !confirm('Discard unsaved changes?')) return;
                  setShowEditModal(false);
                  setIsDirty(false);
                }} 
                className="px-8 py-3 text-sm font-bold text-muted bg-card border border-border-custom rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95 no-3d"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateFile} 
                className="px-10 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-6">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-4xl border border-border-custom flex flex-col h-[80vh]">
            <h2 className="text-xl font-black text-foreground tracking-tight uppercase tracking-widest text-[11px] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 w-fit mb-4">Scratchpad</h2>
            <div className="text-2xl font-black text-foreground mb-6">Paste Content</div>
            <textarea
              id="paste-content"
              name="paste-content"
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="flex-1 block w-full bg-background border border-border-custom rounded-2xl shadow-inner text-foreground focus:ring-2 focus:ring-blue-500/50 outline-none mb-6 p-8 font-mono text-sm resize-none scrollbar-hide"
              placeholder="Paste your content here..."
              autoFocus
            ></textarea>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowPasteModal(false)} className="px-8 py-3 text-sm font-bold text-muted hover:text-foreground no-3d transition-colors">Cancel</button>
              <button 
                onClick={handlePaste}
                className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
              >
                Save to Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-6">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-4xl border border-border-custom flex flex-col h-[80vh]">
            <h2 className="text-xl font-black text-foreground tracking-tight uppercase tracking-widest text-[11px] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 w-fit mb-4">Web Scraper</h2>
            <div className="text-2xl font-black text-foreground mb-6">Import from URL</div>
            <div className="flex gap-3 mb-6">
              <input
                id="import-url"
                name="import-url"
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 bg-background border border-border-custom rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              />
              <button 
                onClick={handleFetchPreview}
                disabled={isFetching}
                className="bg-card border border-border-custom text-foreground px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                {isFetching ? 'Fetching...' : 'Fetch Content'}
              </button>
            </div>
            <textarea
              id="import-preview"
              name="import-preview"
              value={importPreviewContent}
              onChange={(e) => setImportPreviewContent(e.target.value)}
              className="flex-1 block w-full bg-background border border-border-custom rounded-2xl shadow-inner text-foreground focus:ring-2 focus:ring-blue-500/50 outline-none mb-6 p-8 font-mono text-sm resize-none scrollbar-hide"
              placeholder="Fetched content will appear here..."
            ></textarea>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowImportModal(false)} className="px-8 py-3 text-sm font-bold text-muted hover:text-foreground no-3d transition-colors">Cancel</button>
              <button 
                onClick={handleImport}
                disabled={!importPreviewContent.trim()}
                className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                Save to Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[120] p-6">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-2xl border border-border-custom">
            <h2 className="text-foreground tracking-tight uppercase tracking-widest text-[11px] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 w-fit mb-4">File Manager</h2>
            <div className="text-lg font-semibold text-foreground mb-6">Move {showMoveModal.name}</div>
            
            <div className="bg-background rounded-2xl border border-border-custom p-4 mb-6">
              <div className="flex items-center gap-2 mb-4 p-2 bg-card rounded-xl border border-border-custom overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button onClick={handleMoveBrowseBack} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full no-3d transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <span className="text-xs font-mono text-muted">{moveBrowsePath}</span>
              </div>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-2 scrollbar-hide">
                {moveBrowseItems.map(folder => (
                  <button 
                    key={folder.path}
                    onClick={() => handleMoveBrowseClick(folder.path)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-all no-3d group"
                  >
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">{folder.name}</span>
                  </button>
                ))}
                {moveBrowseItems.length === 0 && <div className="text-center py-8 text-muted italic text-xs">No subfolders</div>}
              </div>
            </div>

            <div className="mb-8">
              <label htmlFor="move-target" className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Target Path</label>
              <input
                id="move-target"
                name="move-target"
                type="text"
                value={moveToPath}
                onChange={(e) => setMoveToPath(e.target.value)}
                className="w-full bg-background border border-border-custom rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-mono"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button onClick={() => setShowMoveModal(null)} className="px-6 py-3 text-sm font-bold text-muted hover:text-foreground no-3d transition-colors">Cancel</button>
              <button 
                onClick={handleMove}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
              >
                Move Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DocsBrowser: React.FC = () => {
  return (
    <ToastProvider>
      <DocsBrowserContent />
    </ToastProvider>
  );
};

export default DocsBrowser;
