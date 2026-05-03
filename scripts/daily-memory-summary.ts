#!/usr/bin/env node
/**
 * Daily Memory Summary Automation
 * 
 * This script runs at 4:00 AM daily to:
 * 1. Read memory/YYYY-MM-DD.md files from the past 24 hours
 * 2. Use Archivist (Claude 3 Opus) to analyze and synthesize content
 * 3. Categorize entries by: Projects, Decisions, Lessons Learned, Key Events
 * 4. Generate organized summaries in docs/memory-summaries/
 * 5. Update MEMORY.md with distilled knowledge
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MEMORY_DIR = 'C:/Users/tberg/.openclaw/workspace/memory';
const DOCS_DIR = 'C:/Users/tberg/.openclaw/workspace/docs';
const MEMORY_FILE = 'C:/Users/tberg/.openclaw/workspace/MEMORY.md';

interface MemoryEntry {
  date: string;
  content: string;
  categories: string[];
}

interface CategorizedSummary {
  projects: string[];
  decisions: string[];
  lessons: string[];
  events: string[];
  rawContent: string;
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function getMemoryFiles(): string[] {
  const yesterday = getYesterdayDate();
  const files: string[] = [];
  
  // Look for yesterday's memory file
  const yesterdayFile = path.join(MEMORY_DIR, `${yesterday}.md`);
  if (fs.existsSync(yesterdayFile)) {
    files.push(yesterdayFile);
  }
  
  // Also check for any files from the last 7 days that haven't been processed
  for (let i = 2; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const filePath = path.join(MEMORY_DIR, `${dateStr}.md`);
    if (fs.existsSync(filePath)) {
      files.push(filePath);
    }
  }
  
  return files;
}

function readMemoryFile(filePath: string): MemoryEntry | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');
    return {
      date: fileName,
      content,
      categories: []
    };
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    return null;
  }
}

function ensureDocsDir(): void {
  const summariesDir = path.join(DOCS_DIR, 'memory-summaries');
  if (!fs.existsSync(summariesDir)) {
    fs.mkdirSync(summariesDir, { recursive: true });
  }
}

async function generateAISummary(entries: MemoryEntry[]): Promise<CategorizedSummary | null> {
  if (entries.length === 0) {
    return null;
  }

  // Combine all memory content
  const combinedContent = entries.map(e => 
    `## ${e.date}\n\n${e.content}`
  ).join('\n\n---\n\n');

  // Create a prompt for the Archivist agent
  const prompt = `You are the Archivist, an AI specialized in knowledge retention and synthesis.

Please analyze the following daily memory logs and categorize the key information:

${combinedContent}

Provide a structured summary with the following categories:
1. PROJECTS - List any projects mentioned, their status, and key actions taken
2. DECISIONS - Important decisions made and their rationale
3. LESSONS LEARNED - Key insights, mistakes to avoid, or better approaches discovered
4. KEY EVENTS - Significant occurrences or milestones

Format your response as a structured JSON object with these exact keys:
{
  "projects": ["string array of project summaries"],
  "decisions": ["string array of decision summaries"],
  "lessons": ["string array of lesson summaries"],
  "events": ["string array of key event summaries"]
}`;

  try {
    // Use anthropic/claude-3-opus-20240229 (Archivist's model)
    const result = execSync(
      `echo "${prompt.replace(/"/g, '\\"')}" | openclaw chat --model anthropic/claude-3-opus-20240229 --system "You are a memory archivist. Output only valid JSON."`,
      { encoding: 'utf-8', timeout: 60000 }
    );
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        projects: parsed.projects || [],
        decisions: parsed.decisions || [],
        lessons: parsed.lessons || [],
        events: parsed.events || [],
        rawContent: combinedContent
      };
    }
  } catch (e) {
    console.error('Error generating AI summary:', e);
  }

  return null;
}

function generateSummaryDocument(
  date: string, 
  summary: CategorizedSummary
): string {
  return `# Memory Summary for ${date}

Generated: ${new Date().toLocaleString()}
Agent: Archivist (anthropic/claude-3-opus-20240229)

---

## 📁 Projects

${summary.projects.length > 0 ? summary.projects.map(p => `- ${p}`).join('\n') : '*No projects recorded*'}

---

## 🎯 Decisions

${summary.decisions.length > 0 ? summary.decisions.map(d => `- ${d}`).join('\n') : '*No decisions recorded*'}

---

## 🧠 Lessons Learned

${summary.lessons.length > 0 ? summary.lessons.map(l => `- ${l}`).join('\n') : '*No lessons recorded*'}

---

## 📅 Key Events

${summary.events.length > 0 ? summary.events.map(e => `- ${e}`).join('\n') : '*No key events recorded*'}

---

*This summary was automatically generated by the Daily Memory Summary Automation.*
`;
}

function updateLongTermMemory(summary: CategorizedSummary): void {
  try {
    let memoryContent = '';
    if (fs.existsSync(MEMORY_FILE)) {
      memoryContent = fs.readFileSync(MEMORY_FILE, 'utf-8');
    }

    const today = new Date().toISOString().split('T')[0];
    let newEntry = `\n\n## Daily Summary (${today})\n\n`;
    
    if (summary.projects.length > 0) {
      newEntry += `**Projects:** ${summary.projects.length} active\n`;
    }
    if (summary.decisions.length > 0) {
      newEntry += `**Decisions:** ${summary.decisions.length} made\n`;
    }
    if (summary.lessons.length > 0) {
      newEntry += `**Lessons:** ${summary.lessons.length} learned\n`;
    }

    // Append to MEMORY.md
    fs.appendFileSync(MEMORY_FILE, newEntry);
    console.log('Updated MEMORY.md with daily summary');
  } catch (e) {
    console.error('Error updating MEMORY.md:', e);
  }
}

async function main(): Promise<void> {
  console.log('🤖 Daily Memory Summary Automation Starting...\n');
  
  // Get memory files
  const memoryFiles = getMemoryFiles();
  console.log(`Found ${memoryFiles.length} memory files to process`);
  
  if (memoryFiles.length === 0) {
    console.log('No memory files found. Skipping summary generation.');
    return;
  }
  
  // Read memory files
  const entries: MemoryEntry[] = memoryFiles
    .map(readMemoryFile)
    .filter((e): e is MemoryEntry => e !== null);
  
  console.log(`Successfully read ${entries.length} memory entries`);
  
  // Ensure docs directory exists
  ensureDocsDir();
  
  // Generate AI summary using Archivist
  console.log('🧠 Asking Archivist to analyze and synthesize memories...');
  const summary = await generateAISummary(entries);
  
  if (!summary) {
    console.error('Failed to generate AI summary');
    return;
  }
  
  console.log('✅ Summary generated successfully');
  
  // Generate output file
  const yesterday = getYesterdayDate();
  const summaryFile = path.join(DOCS_DIR, 'memory-summaries', `${yesterday}-summary.md`);
  const summaryContent = generateSummaryDocument(yesterday, summary);
  
  fs.writeFileSync(summaryFile, summaryContent);
  console.log(`📝 Summary saved to: ${summaryFile}`);
  
  // Update MEMORY.md
  updateLongTermMemory(summary);
  
  console.log('\n✨ Daily Memory Summary Automation Complete!');
}

// Run the automation
main().catch(console.error);
