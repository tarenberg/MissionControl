#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const OPENCLAW_WORKSPACE = 'C:/Users/tberg/.openclaw/workspace';
const MEMORY_DIR = path.join(OPENCLAW_WORKSPACE, 'memory');

const argDate = process.argv.find(arg => arg.startsWith('--date='));
const parseDateInput = (value) => {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [yyyy, mm, dd] = parts;
  return new Date(yyyy, mm - 1, dd);
};
const targetDate = argDate ? parseDateInput(argDate.split('=')[1]) : new Date();

if (!targetDate || Number.isNaN(targetDate.getTime())) {
  console.error('[daily-memory] Invalid date supplied. Use --date=YYYY-MM-DD');
  process.exit(1);
}

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const summaryDate = formatDate(targetDate);
const memoryFileName = `${summaryDate}.md`;
const memoryFilePath = path.join(MEMORY_DIR, memoryFileName);

fs.mkdirSync(MEMORY_DIR, { recursive: true });

if (fs.existsSync(memoryFilePath)) {
  console.log(`[daily-memory] ${memoryFileName} already exists. Nothing to do.`);
  process.exit(0);
}

const template = `# Daily Memory – ${summaryDate}\n\n## General\n- TODO: record highlights from the day.\n`;

fs.writeFileSync(memoryFilePath, template, 'utf-8');
console.log(`[daily-memory] Created ${memoryFilePath}`);
