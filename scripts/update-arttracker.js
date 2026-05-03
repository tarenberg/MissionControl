const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.project.update({
    where: { id: 'proj-arttracker' },
    data: { 
      devUrl: 'https://100.109.216.115:3001',
      localUrl: 'C:\\Users\\tberg\\Documents\\_PROJECTS\\ArtTracker'
    }
  });
  console.log('Updated ArtTracker');
}

main().catch(console.error).finally(() => prisma.$disconnect());
