const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'asc' }
  });
  console.log('--- ALL MESSAGES IN SQLITE ---');
  console.log(messages);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
