const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const logs = await prisma.climateLog.findMany({
    take: 5,
    orderBy: { timestamp: 'desc' }
  });
  console.log(JSON.stringify(logs, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
