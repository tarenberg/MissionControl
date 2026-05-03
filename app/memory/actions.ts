"use server";

import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const OPENCLAW_WORKSPACE = 'C:\\Users\\tberg\\.openclaw\\workspace';
const MEMORY_MD_PATH = path.join(OPENCLAW_WORKSPACE, 'MEMORY.md');
const DAILY_MEMORY_DIR = path.join(OPENCLAW_WORKSPACE, 'memory');

export async function getLongTermMemoryContent(): Promise<string> {
  try {
    return readFileSync(MEMORY_MD_PATH, 'utf-8');
  } catch (error) {
    console.error('Error reading MEMORY.md:', error);
    return 'Error loading long-term memory.';
  }
}

export async function getDailyMemoryFileNames(): Promise<string[]> {
  try {
    const files = readdirSync(DAILY_MEMORY_DIR);
    return files.filter(file => file.endsWith('.md') && file.startsWith('20')); // Filter for YYYY-MM-DD.md pattern
  } catch (error) {
    console.error('Error listing daily memory files:', error);
    return [];
  }
}

export async function getDailyMemoryContent(fileName: string): Promise<string> {
  try {
    const filePath = path.join(DAILY_MEMORY_DIR, fileName);
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading daily memory file ${fileName}:`, error);
    return `Error loading daily memory for ${fileName}.`;
  }
}
