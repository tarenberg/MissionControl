const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { localUrl: { not: null }, status: { not: 'archived' } },
    select: { title: true, localUrl: true }
  });
  console.log(JSON.stringify(projects, null, 2));
}

main().finally(() => prisma.$disconnect());
