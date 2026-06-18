const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Better CSV parser that handles quoted fields properly
function parseCSV(content) {
  const lines = content.split('\n');
  const headerLine = lines[0];
  const headers = [];
  let currentHeader = '';
  let inQuotes = false;
  
  // Parse header
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(currentHeader.trim());
      currentHeader = '';
    } else {
      currentHeader += char;
    }
  }
  headers.push(currentHeader.trim());
  
  // Parse records
  const records = [];
  let i = 1;
  
  while (i < lines.length) {
    const record = {};
    let currentField = '';
    let inQuotes = false;
    let colIndex = 0;
    let j = 0;
    const line = lines[i];
    
    if (!line.trim()) {
      i++;
      continue;
    }
    
    // Check if line starts with a quote (might be multiline)
    while (j < line.length && colIndex < headers.length) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        j++;
      } else if (char === ',' && !inQuotes) {
        record[headers[colIndex]] = currentField.trim();
        currentField = '';
        colIndex++;
        j++;
      } else {
        currentField += char;
        j++;
      }
    }
    
    // Check if we still have an open quote (multiline field)
    if (inQuotes) {
      // Continue reading lines until quote is closed
      i++;
      while (i < lines.length && inQuotes) {
        currentField += '\n' + lines[i];
        for (let k = 0; k < lines[i].length; k++) {
          if (lines[i][k] === '"' && (k === 0 || lines[i][k-1] !== '"')) {
            inQuotes = !inQuotes;
          }
        }
        i++;
      }
      i--; // Back up one since we'll increment at loop end
    }
    
    // Last field
    if (colIndex < headers.length) {
      record[headers[colIndex]] = currentField.trim();
    }
    
    if (Object.keys(record).length > 0 && record[headers[0]]) {
      records.push(record);
    }
    
    i++;
  }
  
  return records;
}

async function importChroniclesCSV() {
  try {
    const csvPath = String.raw`G:\My Drive\Chronicles\chronicles_text_records.csv`;
    console.log('Reading from:', csvPath);
    
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSV(fileContent);
    
    console.log(`Found ${records.length} records\n`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        if (!record.title || !record.createdAt) {
          continue;
        }
        
        const createdAt = record.createdAt 
          ? new Date(parseInt(record.createdAt))
          : new Date(record.date);
        
        if (isNaN(createdAt.getTime())) {
          console.log(`⏭️  Skipped: "${record.title}" (invalid date)`);
          skipped++;
          continue;
        }
        
        const existing = await prisma.journalEntry.findFirst({
          where: {
            AND: [
              { title: record.title || null },
              { 
                createdAt: {
                  gte: new Date(createdAt.getTime() - 1000),
                  lte: new Date(createdAt.getTime() + 1000)
                }
              }
            ]
          }
        });
        
        if (existing) {
          console.log(`⏭️  Skipped: "${record.title}"`);
          skipped++;
          continue;
        }
        
        await prisma.journalEntry.create({
          data: {
            title: record.title || null,
            content: record.content || '',
            location: record.location || null,
            weather: record.weather || null,
            mood: null,
            createdAt: createdAt,
            updatedAt: createdAt
          }
        });
        
        console.log(`✅ Imported: "${record.title}" (${createdAt.toISOString().split('T')[0]})`);
        imported++;
        
      } catch (err) {
        if (record.title) {
          console.error(`❌ Error importing "${record.title}":`, err.message);
        }
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total in database: ${await prisma.journalEntry.count()}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importChroniclesCSV();
