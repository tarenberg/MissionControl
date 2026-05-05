const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const task = await prisma.task.create({
    data: {
      title: 'Test Task from AI',
      description: 'Testing if Prisma works',
      status: 'Backlog',
    },
  });
  console.log('Created task:', task);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
