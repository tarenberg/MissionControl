"use server";

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { Task } from '@/interfaces/Task';

const WORKSPACE_TASKS_PATH = 'C:/Users/tberg/.openclaw/workspace/tasks/todo.md';

const sanitize = (text: string) => text.replace(/^[-*]\s*/g, '').trim();

export async function getWorkspaceTasksServer(): Promise<Task[]> {
  let fileContent = '';
  try {
    if (!existsSync(WORKSPACE_TASKS_PATH)) {
      console.log('[getWorkspaceTasksServer] todo.md not found. Returning empty array.');
      return [];
    }
    fileContent = readFileSync(WORKSPACE_TASKS_PATH, 'utf-8');
  } catch (error) {
    console.error('[getWorkspaceTasksServer] Failed to load workspace tasks:', error);
    return [];
  }

  const blocks = fileContent.split(/\n##\s+Task:/).filter(Boolean);
  const tasks: Task[] = blocks.map((block, index) => {
    const lines = block.trim().split('\n');
    const headerLine = lines.shift() || '';
    const title = headerLine.replace(/##\s*Task:\s*/i, '').trim(); // More robust title extraction
    console.log(`[getWorkspaceTasksServer] Processing task: Raw header='${headerLine}', Parsed title='${title}'`);

    const checkboxLines = lines.filter((line) => /- \[[ xX]\]/.test(line));
    const totalItems = checkboxLines.length;
    const completedItems = checkboxLines.filter((line) => /- \[x\]/.test(line)).length;

    let status: Task['status'] = 'Backlog';

    // Check for Recurring status first
    if (title.toLowerCase().includes('(recurring)')) {
      status = 'Recurring';
    } else {
      // Existing logic for Backlog, In Progress, Done
      if (totalItems === 0) {
        status = 'Backlog';
      } else if (completedItems === 0 && totalItems > 0) {
        status = 'Backlog';
      } else if (completedItems > 0 && completedItems < totalItems) {
        status = 'In Progress';
      } else if (completedItems === totalItems && totalItems > 0) {
        status = 'Done';
      } else {
        status = 'Backlog'; // Default fallback
      }
    }
    console.log(`[getWorkspaceTasksServer] Assigned status for '${title}': ${status}`);
    const description = checkboxLines
      .map((line) => sanitize(line.replace(/- \[[ xX]\]/, '•')))
      .join('\n');

    return {
      id: `workspace-task-${index}`,
      title,
      description,
      assignedTo: 'M',
      status,
      tags: ['workspace'],
    } as Task;
  });

  return tasks;
}
