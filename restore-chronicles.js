const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restore() {
  try {
    // Read the backup file
    const backupPath = String.raw`G:\My Drive\Chronicles\chronicles_backup_2026-03-19.json`;
    console.log('Reading backup from:', backupPath);
    
    const rawData = fs.readFileSync(backupPath, 'utf8');
    const entries = JSON.parse(rawData);
    
    console.log(`Found ${entries.length} entries in backup\n`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const entry of entries) {
      try {
        // Convert timestamp to Date
        const createdAt = entry.createdAt 
          ? new Date(entry.createdAt)
          : new Date(entry.date);
        
        // Check if entry already exists based on createdAt and title
        const existing = await prisma.journalEntry.findFirst({
          where: {
            AND: [
              { title: entry.title || null },
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
          console.log(`⏭️  Skipped: "${entry.title || 'Untitled'}" (already exists)`);
          skipped++;
          continue;
        }
        
        // Create the entry
        await prisma.journalEntry.create({
          data: {
            title: entry.title || null,
            content: entry.content || '',
            location: entry.location || null,
            weather: entry.weather || null,
            mood: null, // Not in old format
            media: entry.media && entry.media.length > 0 
              ? JSON.stringify(entry.media) 
              : null,
            tags: entry.tags && entry.tags.length > 0
              ? JSON.stringify(entry.tags)
              : null,
            createdAt: createdAt,
            updatedAt: createdAt
          }
        });
        
        const preview = entry.content.substring(0, 60).replace(/\n/g, ' ');
        console.log(`✅ Imported: "${entry.title || 'Untitled'}" (${createdAt.toISOString().split('T')[0]})`);
        console.log(`   ${preview}${entry.content.length > 60 ? '...' : ''}\n`);
        imported++;
        
      } catch (err) {
        console.error(`❌ Error importing "${entry.title}":`, err.message);
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

restore();
