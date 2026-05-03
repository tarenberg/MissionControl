const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.project.update({
    where: { id: 'proj-palette-picker-pro' },
    data: { 
      devUrl: 'https://100.109.216.115:3012',
      localUrl: 'C:\\Users\\tberg\\Documents\\_PROJECTS\\PalettePickerPro'
    }
  });
  console.log('Updated Palette Picker Pro');
}

main().catch(console.error).finally(() => prisma.$disconnect());
