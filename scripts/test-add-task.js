const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const task = await prisma.task.create({
    data: {
      title: 'Test Task from Script',
      description: 'Testing if Prisma works',
      status: 'Backlog',
    },
  });
  console.log('Created task:', JSON.stringify(task, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
