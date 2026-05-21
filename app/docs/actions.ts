"use server";

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, renameSync, unlinkSync, rmdirSync, existsSync, appendFileSync } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OPENCLAW_WORKSPACE_DIR = 'C:\\Users\\tberg\\.openclaw\\workspace';
const OPENCLAW_DOCS_DIR = path.join(OPENCLAW_WORKSPACE_DIR, 'docs');
const MEMORY_DIR = path.join(OPENCLAW_WORKSPACE_DIR, 'memory');
const PROJECTS_ROOT = 'C:\\Users\\tberg\\Documents\\_PROJECTS';

interface FileSystemItem {
  name: string;
  isFolder: boolean;
  path: string;
  source: 'docs' | 'memory' | 'root' | 'projects' | 'tasks' | 'scripts' | 'skills';
  lastModified?: string;
  size?: number; // in bytes
}

const logFile = path.join(process.cwd(), 'debug_docs.log');
const log = (m: string) => {
  try {
    appendFileSync(logFile, `[${new Date().toISOString()}] ${m}\n`);
    console.log(`[DOCS] ${m}`); // Also log to stdout
  } catch (e) {
    // ignore
  }
};

export async function listDirectoryContents(currentPath: string = '/'): Promise<FileSystemItem[]> {
  try {
    const decodedPath = decodeURIComponent(currentPath);
    log(`LIST: "${decodedPath}"`);

    // If we are at root, show the specialized entry points
    if (decodedPath === '/' || decodedPath === '') {
      return [
        { name: 'Docs Hub', isFolder: true, path: 'docs', source: 'docs' },
        { name: 'Daily Logs & Reports', isFolder: true, path: 'memory', source: 'memory' },
        { name: 'Tasks & Lessons', isFolder: true, path: 'tasks', source: 'tasks' },
        { name: 'Automation Scripts', isFolder: true, path: 'scripts', source: 'scripts' },
        { name: 'Agent Skills', isFolder: true, path: 'skills', source: 'skills' },
        // { name: 'Studio Projects (Source)', isFolder: true, path: 'projects_bridge', source: 'projects' },
        { name: 'MEMORY.md', isFolder: false, path: 'MEMORY.md', source: 'root' },
      ];
    }

    const cleanPath = decodedPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanPath);
    log(`ABSOLUTE: "${absolutePath}"`);

    if (!existsSync(absolutePath)) {
      log(`NOT FOUND: "${absolutePath}"`);
      return [];
    }

    const items = readdirSync(absolutePath, { withFileTypes: true });
    log(`FOUND: ${items.length} items`);
    return items.map(item => {
      const itemPath = path.join(absolutePath, item.name);
      const relativePath = path.relative(OPENCLAW_WORKSPACE_DIR, itemPath).replace(/\\/g, '/');
      
      // Determine if it's a folder: either directly reported as one, or is a link/junction
      let isFolder = item.isDirectory() || item.isSymbolicLink();
      let size: number | undefined = undefined;
      let lastModified: string | undefined = undefined;

      try {
        const stats = statSync(itemPath);
        isFolder = stats.isDirectory();
        lastModified = stats.mtime.toISOString();
        if (stats.isFile()) {
          size = stats.size;
        }
      } catch (e) {
        log(`STAT ERR: "${item.name}" - ${e}. Falling back to folder detection.`);
      }

      log(`ITEM: "${item.name}" | isFolder: ${isFolder} | path: "${relativePath}"`);

      return {
        name: item.name,
        isFolder: isFolder,
        path: relativePath,
        source: relativePath.startsWith('memory') ? 'memory' : 
                relativePath.startsWith('tasks') ? 'tasks' :
                relativePath.startsWith('scripts') ? 'scripts' :
                relativePath.startsWith('skills') ? 'skills' :
                relativePath.startsWith('projects_bridge') ? 'projects' : 'docs',
        lastModified,
        size,
      };
    });
  } catch (error) {
    log(`LIST ERR: ${error}`);
    console.error('Error in listDirectoryContents:', error);
    return [];
  }
}

export async function getFileContent(filePath: string): Promise<string> {
  try {
    const decodedPath = decodeURIComponent(filePath);
    log(`READ: "${decodedPath}"`);
    
    const cleanPath = decodedPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanPath);
    log(`ABSOLUTE: "${absolutePath}"`);

    if (!existsSync(absolutePath)) {
       log(`NOT FOUND: "${absolutePath}"`);
       return `File not found: ${decodedPath} (checked ${absolutePath})`;
    }

    const content = readFileSync(absolutePath, 'utf-8');
    log(`READ OK: ${content.length} bytes`);
    return content;
  } catch (error) {
    log(`READ ERR: "${filePath}" - ${error}`);
    console.error(`Error reading file ${filePath}:`, error);
    return `Error loading content for ${filePath}. Detail: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function createDirectory(parentPath: string, dirName: string): Promise<boolean> {
  try {
    const cleanPath = parentPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanPath, dirName);
    log(`MKDIR: "${absolutePath}"`);
    mkdirSync(absolutePath, { recursive: true });
    return true;
  } catch (error) {
    log(`MKDIR ERR: "${parentPath}/${dirName}" - ${error}`);
    console.error(`Error creating directory:`, error);
    return false;
  }
}

export async function createFile(parentPath: string, fileName: string, content: string): Promise<boolean> {
  try {
    const cleanPath = parentPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanPath, fileName);
    log(`CREATE: "${absolutePath}" (${content.length} bytes)`);
    writeFileSync(absolutePath, content, 'utf-8');
    return true;
  } catch (error) {
    log(`CREATE ERR: "${parentPath}/${fileName}" - ${error}`);
    console.error(`Error creating file:`, error);
    return false;
  }
}

export async function deleteFileOrDirectory(itemPath: string): Promise<boolean> {
  try {
    const cleanPath = itemPath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanPath);
    log(`DELETE: "${absolutePath}"`);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      rmdirSync(absolutePath, { recursive: true });
    } else {
      unlinkSync(absolutePath);
    }
    return true;
  } catch (error) {
    log(`DELETE ERR: "${itemPath}" - ${error}`);
    console.error(`Error deleting ${itemPath}:`, error);
    return false;
  }
}

export async function moveFileOrDirectory(oldRelativePath: string, newRelativePath: string): Promise<boolean> {
  try {
    const cleanOld = oldRelativePath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const cleanNew = newRelativePath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const oldAbsolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanOld);
    const newAbsolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanNew);
    log(`MOVE: "${oldAbsolutePath}" -> "${newAbsolutePath}"`);
    renameSync(oldAbsolutePath, newAbsolutePath);
    return true;
  } catch (error) {
    log(`MOVE ERR: "${oldRelativePath}" -> "${newRelativePath}" - ${error}`);
    console.error(`Error moving item:`, error);
    return false;
  }
}

export async function updateFileContent(filePath: string, newContent: string): Promise<boolean> {
  try {
    const cleanPath = filePath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(OPENCLAW_WORKSPACE_DIR, cleanPath);
    log(`UPDATE: "${absolutePath}" (${newContent.length} bytes)`);
    writeFileSync(absolutePath, newContent, 'utf-8');
    return true;
  } catch (error) {
    log(`UPDATE ERR: "${filePath}" - ${error}`);
    console.error(`Error updating file:`, error);
    return false;
  }
}

export async function searchDocuments(query: string): Promise<FileSystemItem[]> {
  const results: FileSystemItem[] = [];
  const searchInDir = (dir: string, relativeRoot: string) => {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relativePath = path.relative(OPENCLAW_WORKSPACE_DIR, fullPath).replace(/\\/g, '/');
      
      if (item.isDirectory()) {
        searchInDir(fullPath, relativeRoot);
      } else if (item.isFile()) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          if (content.toLowerCase().includes(query.toLowerCase()) || item.name.toLowerCase().includes(query.toLowerCase())) {
            const stats = statSync(fullPath);
            results.push({
              name: item.name,
              isFolder: false,
              path: relativePath,
              source: relativePath.startsWith('memory') ? 'memory' : 'docs',
              lastModified: stats.mtime.toISOString(),
              size: stats.size
            });
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
    }
  };

  searchInDir(OPENCLAW_DOCS_DIR, 'docs');
  searchInDir(MEMORY_DIR, 'memory');
  searchInDir(path.join(OPENCLAW_WORKSPACE_DIR, 'tasks'), 'tasks');
  searchInDir(path.join(OPENCLAW_WORKSPACE_DIR, 'scripts'), 'scripts');
  // searchInDir(path.join(OPENCLAW_WORKSPACE_DIR, 'projects_bridge'), 'projects');
  
  return results.slice(0, 50); // Limit to 50 results
}

export async function generateFilenameFromContent(content: string, type: 'paste' | 'imported'): Promise<string> {
  const firstLine = content.split('\n')[0].slice(0, 50);
  const sanitizedFirstLine = firstLine.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');

  if (sanitizedFirstLine) {
    return `${sanitizedFirstLine}.md`;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `[${type}]-${timestamp}.md`;
}

export async function fetchAndExtractUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return `Error fetching URL: ${response.statusText}`;
    }
    const html = await response.text();
    const dom = new JSDOM(html);
    const reader = new dom.window.DOMParser();
    const doc = reader.parseFromString(dom.window.document.body.innerHTML, 'text/html');
    const article = doc.querySelector('article') || doc.body;
    
    // Remove script and style elements
    const elementsToRemove = article.querySelectorAll('script, style');
    elementsToRemove.forEach(el => el.remove());

    let textContent = article.textContent || '';
    textContent = textContent.replace(/\s\s+/g, ' ').trim();
    
    return `[Source: ${url}]\n\n${textContent}`;
  } catch (error) {
    console.error('Error fetching and extracting URL:', error);
    if (error instanceof Error) {
      return `Error fetching and extracting URL: ${error.message}`;
    }
    return 'An unknown error occurred while fetching the URL.';
  }
}

export async function ensureUniqueFilename(parentPath: string, fileName: string): Promise<string> {
    const absoluteParentPath = path.resolve(OPENCLAW_WORKSPACE_DIR, parentPath.replace(/^\/+/, '').replace(/\//g, path.sep));
    let newFileName = fileName;
    let counter = 2;

    while (true) {
        const absolutePath = path.join(absoluteParentPath, newFileName);
        try {
            statSync(absolutePath);
            const extension = path.extname(fileName);
            const baseName = path.basename(fileName, extension);
            newFileName = `${baseName}-${counter}${extension}`;
            counter++;
        } catch (error) {
            // file does not exist
            return newFileName;
        }
    }
}
