const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { room: true }
  });
  console.log('--- LATEST 10 MESSAGES ---');
  messages.reverse().forEach(m => {
    console.log(`[${m.createdAt.toISOString()}] Room: ${m.room.name} | Role: ${m.role} | Content: ${m.content.substring(0, 60)}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
