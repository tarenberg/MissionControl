const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Set Chronicles to its correct intended port (3001)
  // but Palette Picker is currently on 3001 internally and 3011 publicly.
  // Actually, I'll just clear both so we can start fresh.
  await prisma.project.update({
    where: { id: 'proj-chronicles' },
    data: { devUrl: null }
  });
  await prisma.project.update({
    where: { id: 'proj-palette-picker-pro' },
    data: { devUrl: null }
  });
  console.log('Cleared devUrls');
}

main().catch(console.error).finally(() => prisma.$disconnect());
