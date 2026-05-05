import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.task.updateMany({
    where: { status: 'Working' },
    data: { status: 'In Progress' }
  });
  console.log(`Restored ${result.count} tasks from 'Working' back to 'In Progress'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
