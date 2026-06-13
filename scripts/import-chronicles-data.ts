/**
 * Import Chronicles journal entries into Mission Control database
 * 
 * Usage: npx tsx scripts/import-chronicles-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CHRONICLES_PATH = 'C:\\Users\\tberg\\Documents\\_PROJECTS\\Chronicles\\constants.ts';

interface ChroniclesEntry {
  id: string;
  date: string;
  location?: string;
  temperature?: string;
  title?: string;
  content: string;
  mood?: string;
  tags?: string[];
  media?: any[];
}

function extractEntriesFromFile(): ChroniclesEntry[] {
  console.log('📖 Reading Chronicles constants.ts...');
  const content = fs.readFileSync(CHRONICLES_PATH, 'utf-8');
  
  // Extract the INITIAL_ENTRIES array using regex
  const match = content.match(/export const INITIAL_ENTRIES: JournalEntry\[\] = (\[[\s\S]*?\n\]);/);
  
  if (!match) {
    throw new Error('Could not find INITIAL_ENTRIES in constants.ts');
  }
  
  // The array content
  let arrayContent = match[1];
  
  // Parse entries manually since they contain complex strings
  const entries: ChroniclesEntry[] = [];
  const entryMatches = arrayContent.matchAll(/\{\s*id:\s*['"]([^'"]+)['"]/g);
  
  let currentIndex = 0;
  for (const match of entryMatches) {
    const startIndex = match.index!;
    
    // Find the matching closing brace
    let depth = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < arrayContent.length; i++) {
      if (arrayContent[i] === '{') depth++;
      if (arrayContent[i] === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    const entryText = arrayContent.substring(startIndex, endIndex);
    
    // Extract fields with regex
    const id = match[1];
    const dateMatch = entryText.match(/date:\s*['"]([^'"]+)['"]/);
    const locationMatch = entryText.match(/location:\s*['"]([^'"]+)['"]/);
    const tempMatch = entryText.match(/temperature:\s*['"]([^'"]+)['"]/);
    const titleMatch = entryText.match(/title:\s*['"]([^'"]+)['"]/);
    const moodMatch = entryText.match(/mood:\s*['"]([^'"]+)['"]/);
    
    // Extract content (may span multiple lines)
    const contentMatch = entryText.match(/content:\s*["']([^]*?)["'],?\s*mood:/s);
    
    if (!dateMatch || !contentMatch) {
      console.warn(`⚠️ Skipping malformed entry ${id}`);
      continue;
    }
    
    entries.push({
      id,
      date: dateMatch[1],
      location: locationMatch?.[1],
      temperature: tempMatch?.[1],
      title: titleMatch?.[1],
      content: contentMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'),
      mood: moodMatch?.[1],
    });
  }
  
  console.log(`✅ Found ${entries.length} entries in Chronicles`);
  return entries;
}

function parseChroniclesDate(dateString: string): Date {
  // Convert "February 13, 2026" to Date object
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn(`⚠️ Invalid date: ${dateString}, using current date`);
    return new Date();
  }
  return date;
}

async function importEntry(entry: ChroniclesEntry): Promise<boolean> {
  try {
    // Check if entry already exists by checking for similar content on the same date
    const entryDate = parseChroniclesDate(entry.date);
    const existingEntry = await prisma.journalEntry.findFirst({
      where: {
        title: entry.title || undefined,
        createdAt: {
          gte: new Date(entryDate.setHours(0, 0, 0, 0)),
          lt: new Date(entryDate.setHours(23, 59, 59, 999)),
        },
      },
    });
    
    if (existingEntry) {
      console.log(`⏭️ Skipping duplicate: ${entry.date} - ${entry.title}`);
      return true;
    }
    
    // Create the entry with custom timestamp
    await prisma.journalEntry.create({
      data: {
        title: entry.title || null,
        content: entry.content,
        mood: entry.mood || null,
        location: entry.location || 'New Haven, CT',
        weather: entry.temperature || null,
        createdAt: parseChroniclesDate(entry.date),
        updatedAt: parseChroniclesDate(entry.date),
      },
    });
    
    console.log(`✅ Imported: ${entry.date} - ${entry.title || '(untitled)'}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to import "${entry.title}":`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Chronicles → Mission Control migration\n');
  
  try {
    // Extract entries
    const entries = extractEntriesFromFile();
    
    if (!entries || entries.length === 0) {
      console.error('❌ No entries found to import');
      process.exit(1);
    }
    
    console.log(`\n📦 Importing ${entries.length} entries...\n`);
    
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    
    // Import in chronological order (oldest first)
    const sortedEntries = [...entries].sort((a, b) => {
      const dateA = parseChroniclesDate(a.date);
      const dateB = parseChroniclesDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    for (const entry of sortedEntries) {
      const success = await importEntry(entry);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    console.log(`\n✨ Migration complete!`);
    console.log(`   ✅ Imported: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`\n🎉 Check Mission Control journal at: http://localhost:3000/journal\n`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
