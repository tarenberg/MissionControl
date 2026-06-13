const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importChronicles() {
  try {
    const backupPath = String.raw`G:\My Drive\Chronicles\chronicles_old_formatted2.json`;
    console.log('Reading from:', backupPath);
    
    const rawData = fs.readFileSync(backupPath, 'utf8');
    const entries = JSON.parse(rawData);
    
    console.log(`Found ${entries.length} entries\n`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const entry of entries) {
      try {
        const createdAt = entry.createdAt 
          ? new Date(entry.createdAt)
          : new Date(entry.date);
        
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
          console.log(`⏭️  Skipped: "${entry.title || 'Untitled'}"`);
          skipped++;
          continue;
        }
        
        await prisma.journalEntry.create({
          data: {
            title: entry.title || null,
            content: entry.content || '',
            location: entry.location || null,
            weather: entry.weather || null,
            mood: null,
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

importChronicles();
