const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const entryCount = await prisma.journalEntry.count();
    const mediaCount = await prisma.journalMedia.count();
    console.log('✅ Database healthy');
    console.log(`   JournalEntry: ${entryCount}`);
    console.log(`   JournalMedia: ${mediaCount}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
