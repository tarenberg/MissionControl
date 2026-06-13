const { PrismaClient } = require('@prisma/client');

async function checkBackup() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:C:/Users/tberg/.openclaw/workspace/mission-control-28mb.db'
      }
    }
  });

  try {
    const count = await prisma.journalEntry.count();
    console.log('Backup database - Total entries:', count);
    
    if (count > 0) {
      const recent = await prisma.journalEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          location: true,
        }
      });
      
      console.log('\nRecent entries from backup:');
      recent.forEach(e => {
        const preview = e.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`\n- ${e.createdAt.toISOString()}`);
        console.log(`  Title: ${e.title || '(no title)'}`);
        console.log(`  ${preview}${e.content.length > 100 ? '...' : ''}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBackup();
