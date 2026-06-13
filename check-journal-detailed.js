const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.journalEntry.count();
    console.log('Total journal entries:', count);
    
    const all = await prisma.journalEntry.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        location: true,
        mood: true,
        weather: true,
      }
    });
    
    console.log('\nAll entries:');
    all.forEach((e, i) => {
      const preview = e.content.substring(0, 150).replace(/\n/g, ' ');
      console.log(`\n${i+1}. [${e.id}]`);
      console.log(`   Created: ${e.createdAt.toISOString()}`);
      console.log(`   Updated: ${e.updatedAt.toISOString()}`);
      console.log(`   Title: ${e.title || '(no title)'}`);
      console.log(`   Location: ${e.location || 'none'}`);
      console.log(`   Mood: ${e.mood || 'none'}`);
      console.log(`   Weather: ${e.weather || 'none'}`);
      console.log(`   Content: ${preview}${e.content.length > 150 ? '...' : ''}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
