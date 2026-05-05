import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.task.updateMany({
    where: { status: 'In Progress' },
    data: { status: 'Working' }
  });
  console.log(`Updated ${result.count} tasks from 'In Progress' to 'Working'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
