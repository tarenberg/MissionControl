const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.project.updateMany({
    where: { status: { in: ['Active', 'ACTIVE'] } },
    data: { status: 'active' }
  });
  console.log(`Updated ${result.count} projects to lowercase 'active' status.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
