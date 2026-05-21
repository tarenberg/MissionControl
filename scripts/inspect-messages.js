const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.chatRoom.findMany();
  console.log('--- ROOMS IN DB ---');
  rooms.forEach(r => console.log(`Room: ${r.name} | ID: ${r.id}`));

  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15
  });
  console.log('\n--- LATEST 15 MESSAGES IN DB ---');
  messages.forEach(m => {
    console.log(`[${m.createdAt.toISOString()}] RoomID: ${m.roomId} | Role: ${m.role} | Content: ${m.content}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
