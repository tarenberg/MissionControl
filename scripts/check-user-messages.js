const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.chatMessage.findMany({
    where: {
      role: 'user',
      createdAt: {
        gte: new Date('2026-05-21T00:00:00.000Z')
      }
    },
    include: { room: true }
  });
  console.log('--- USER MESSAGES TODAY ---');
  console.log(messages);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
