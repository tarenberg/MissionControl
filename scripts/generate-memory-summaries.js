#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const OPENCLAW_WORKSPACE = 'C:/Users/tberg/.openclaw/workspace';
const MEMORY_DIR = path.join(OPENCLAW_WORKSPACE, 'memory');
const DOCS_PROJECTS_DIR = path.join(OPENCLAW_WORKSPACE, 'docs', 'projects');

const argDate = process.argv.find(arg => arg.startsWith('--date='));
const parseDateInput = (value) => {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [yyyy, mm, dd] = parts;
  return new Date(yyyy, mm - 1, dd);
};
const targetDate = argDate ? parseDateInput(argDate.split('=')[1]) : new Date(Date.now() - 24 * 60 * 60 * 1000);

if (!targetDate || Number.isNaN(targetDate.getTime())) {
  console.error('[memory-summary] Invalid date supplied. Use --date=YYYY-MM-DD');
  process.exit(1);
}

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const ensureDailyMemoryFile = (date) => {
  const dateLabel = formatDate(date);
  const fileName = `${dateLabel}.md`;
  const filePath = path.join(MEMORY_DIR, fileName);
  fs.mkdirSync(MEMORY_DIR, { recursive: true });

  if (fs.existsSync(filePath)) {
    console.log(`[memory-summary] Daily memory file ${fileName} already exists.`);
    return;
  }

  const template = `# Daily Memory – ${dateLabel}\n\n## General\n- TODO: record highlights from the day.\n`;
  fs.writeFileSync(filePath, template, 'utf-8');
  console.log(`[memory-summary] Seeded daily memory file ${filePath}`);
};

const seedNextDayMemoryFile = () => {
  const nextDate = new Date(targetDate.getTime());
  nextDate.setDate(nextDate.getDate() + 1);
  ensureDailyMemoryFile(nextDate);
};

const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'general';
};

const summaryDate = formatDate(targetDate);
const memoryFileName = `${summaryDate}.md`;
const memoryFilePath = path.join(MEMORY_DIR, memoryFileName);

if (!fs.existsSync(memoryFilePath)) {
  console.log(`[memory-summary] No daily memory file found for ${summaryDate}. Nothing to summarize.`);
  seedNextDayMemoryFile();
  process.exit(0);
}

const rawContent = fs.readFileSync(memoryFilePath, 'utf-8');
const lines = rawContent.split(/\r?\n/);

const sections = {};
let currentSection = 'general';
sections[currentSection] = [];

for (const line of lines) {
  const headingMatch = line.match(/^##\s+(.+)/);
  if (headingMatch) {
    currentSection = headingMatch[1].trim();
    if (!sections[currentSection]) {
      sections[currentSection] = [];
    }
  } else {
    sections[currentSection].push(line);
  }
}

if (Object.keys(sections).length === 0) {
  console.log('[memory-summary] Daily memory file is empty.');
  seedNextDayMemoryFile();
  process.exit(0);
}

for (const [sectionName, contentLines] of Object.entries(sections)) {
  const trimmedContent = contentLines.join('\n').trim();
  if (!trimmedContent) continue; // Skip empty sections

  const slug = slugify(sectionName === 'general' ? 'general' : sectionName);
  const projectDir = path.join(DOCS_PROJECTS_DIR, slug);
  fs.mkdirSync(projectDir, { recursive: true });

  const summaryPath = path.join(projectDir, `${summaryDate}-summary.md`);
  const headerTitle = sectionName === 'general' ? 'General Notes' : sectionName;
  const fileBody = `# ${headerTitle} – Daily Summary (${summaryDate})\n\n${trimmedContent}\n`;

  fs.writeFileSync(summaryPath, fileBody, 'utf-8');
  console.log(`[memory-summary] Wrote ${summaryPath}`);
}

seedNextDayMemoryFile();
console.log('[memory-summary] Completed.');
