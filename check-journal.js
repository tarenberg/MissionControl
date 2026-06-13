const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.journalEntry.count();
    console.log('Total journal entries:', count);
    
    if (count > 0) {
      const recent = await prisma.journalEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          location: true,
        }
      });
      
      console.log('\nRecent entries:');
      recent.forEach(e => {
        const preview = e.content.substring(0, 100);
        console.log(`- ${e.createdAt.toISOString()}: ${e.title || '(no title)'}`);
        console.log(`  ${preview}${e.content.length > 100 ? '...' : ''}\n`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
