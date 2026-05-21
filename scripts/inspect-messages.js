const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.chatRoom.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });
  console.log('--- Active Rooms & Messages ---');
  rooms.forEach(r => {
    console.log(`Room: ${r.name} (ID: ${r.id})`);
    r.messages.reverse().forEach(m => {
      console.log(`  [${m.role}] ${m.content.substring(0, 60)}...`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
