/**
 * Import Chronicles journal entries into Mission Control database
 * 
 * Usage: node scripts/import-chronicles-data.js
 */

const fs = require('fs');
const path = require('path');

const CHRONICLES_PATH = 'C:\\Users\\tberg\\Documents\\_PROJECTS\\Chronicles\\constants.ts';
const API_URL = 'http://localhost:3000/api/journal';

async function extractEntriesFromConstants() {
  console.log('📖 Reading Chronicles constants.ts...');
  const content = fs.readFileSync(CHRONICLES_PATH, 'utf-8');
  
  // Extract the INITIAL_ENTRIES array
  const match = content.match(/export const INITIAL_ENTRIES: JournalEntry\[\] = (\[[\s\S]*?\n\]);/);
  
  if (!match) {
    throw new Error('Could not find INITIAL_ENTRIES in constants.ts');
  }
  
  // Parse the array (we'll use a safe eval approach)
  const entriesString = match[1]
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Use JSON.parse after converting to valid JSON
  const jsonString = entriesString
    .replace(/'/g, '"')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*\]/g, ']');
  
  try {
    const entries = JSON.parse(jsonString);
    console.log(`✅ Found ${entries.length} entries in Chronicles`);
    return entries;
  } catch (e) {
    console.error('❌ Failed to parse entries. Trying alternative method...');
    
    // Alternative: Extract entries one by one using regex
    const entryMatches = [...content.matchAll(/\{[\s\S]*?id:\s*['"](\d+)['"]/g)];
    console.log(`Found ${entryMatches.length} entries via regex`);
    
    // Manual parsing fallback
    return parseEntriesManually(content);
  }
}

function parseEntriesManually(content) {
  const entries = [];
  const entryPattern = /\{\s*id:\s*['"]([^'"]+)['"],\s*date:\s*['"]([^'"]+)['"],\s*location:\s*['"]([^'"]+)['"],?\s*temperature:\s*['"]([^'"]+)['"],?\s*title:\s*['"]([^'"]+)['"],\s*content:\s*["']([^]+?)["'],\s*mood:\s*['"]([^'"]+)['"],?\s*tags:\s*\[([^\]]+)\]/g;
  
  let match;
  while ((match = entryPattern.exec(content)) !== null) {
    const [_, id, date, location, temperature, title, contentRaw, mood, tagsRaw] = match;
    
    entries.push({
      id,
      date,
      location,
      temperature,
      title,
      content: contentRaw.replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      mood,
      tags: tagsRaw.split(',').map(t => t.trim().replace(/['"]/g, ''))
    });
  }
  
  return entries;
}

function parseChroniclesDate(dateString) {
  // Convert "February 13, 2026" to ISO timestamp
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn(`⚠️ Invalid date: ${dateString}`);
    return new Date().toISOString();
  }
  return date.toISOString();
}

async function importEntry(entry) {
  const payload = {
    title: entry.title || null,
    content: entry.content,
    mood: entry.mood || null,
    location: entry.location || 'New Haven, CT',
    weather: entry.temperature || null,
    media: entry.media || [],
    // Override createdAt timestamp
    createdAt: parseChroniclesDate(entry.date)
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error(`❌ Failed to import entry "${entry.title}": ${result.error || response.statusText}`);
      return false;
    }
    
    console.log(`✅ Imported: ${entry.date} - ${entry.title}`);
    return true;
  } catch (error) {
    console.error(`❌ Network error importing "${entry.title}":`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Chronicles → Mission Control migration\n');
  
  // Check if dev server is running
  try {
    await fetch(API_URL.replace('/api/journal', '/api/health'));
    console.log('✅ Mission Control dev server is running\n');
  } catch (e) {
    console.error('❌ Mission Control dev server is not running!');
    console.error('   Please start it first: cd MissionControl && npm run dev\n');
    process.exit(1);
  }
  
  // Extract entries
  const entries = await extractEntriesFromConstants();
  
  if (!entries || entries.length === 0) {
    console.error('❌ No entries found to import');
    process.exit(1);
  }
  
  console.log(`\n📦 Importing ${entries.length} entries...\n`);
  
  let successCount = 0;
  let failureCount = 0;
  
  // Import in chronological order (oldest first)
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });
  
  for (const entry of sortedEntries) {
    const success = await importEntry(entry);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Rate limiting: wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✨ Migration complete!`);
  console.log(`   ✅ Imported: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`\n🎉 Check Mission Control journal at: http://localhost:3000/journal\n`);
}

main().catch(console.error);
