const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.chatRoom.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  console.log('--- ALL ROOMS IN SQLITE ---');
  console.log(JSON.stringify(rooms, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
