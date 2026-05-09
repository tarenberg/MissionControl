import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const artworks = await prisma.artPiece.findMany({
    where: {
      OR: [
        { title: { contains: 'Anchor' } },
        { title: { contains: 'Bar' } },
        { title: { contains: 'Grill' } }
      ]
    }
  });
  console.log(JSON.stringify(artworks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
