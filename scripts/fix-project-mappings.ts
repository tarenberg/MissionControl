import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update Chronicles
  await prisma.project.update({
    where: { id: 'proj-chronicles' },
    data: {
      devUrl: 'http://100.109.216.115:3001',
      status: 'active'
    },
  });

  // Update ArtTracker (already done devUrl but let's be sure)
  await prisma.project.update({
    where: { id: 'proj-arttracker' },
    data: {
      devUrl: 'http://100.109.216.115:3002', // Assuming it's on 3002 if 3001 is Chronicles
    },
  });

  console.log('Updated projects mapping');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
