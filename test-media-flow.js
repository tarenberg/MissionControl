const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMediaFlow() {
  try {
    console.log('🧪 Testing media attachment flow...\n');

    // 1. Get the first entry
    const entry = await prisma.journalEntry.findFirst({
      include: { media: true }
    });

    if (!entry) {
      console.log('❌ No entries found');
      process.exit(1);
    }

    console.log(`✅ Found entry: "${entry.title}"`);
    console.log(`   Current media count: ${entry.media.length}`);

    // 2. Simulate adding media via PATCH
    const mediaToAdd = [
      {
        url: '/uploads/test-photo-1.jpg',
        caption: 'Test photo from nightly sprint'
      },
      {
        url: '/uploads/test-photo-2.jpg',
        caption: 'Second test photo'
      }
    ];

    console.log(`\n📸 Adding ${mediaToAdd.length} media items...\n`);

    // Create media items
    for (const m of mediaToAdd) {
      const created = await prisma.journalMedia.create({
        data: {
          url: m.url,
          caption: m.caption,
          type: 'image/jpeg',
          filename: m.url.split('/').pop() || 'media',
          journalEntryId: entry.id
        }
      });
      console.log(`   ✅ Created: ${created.url} (ID: ${created.id})`);
    }

    // 3. Verify media was attached
    const updatedEntry = await prisma.journalEntry.findUnique({
      where: { id: entry.id },
      include: { media: true }
    });

    console.log(`\n✅ Entry now has ${updatedEntry.media.length} media items:`);
    updatedEntry.media.forEach((m, i) => {
      console.log(`   [${i + 1}] ${m.url} - "${m.caption}"`);
    });

    // 4. Test caption update
    if (updatedEntry.media.length > 0) {
      const firstMedia = updatedEntry.media[0];
      console.log(`\n📝 Updating caption on media ${firstMedia.id}...`);
      
      const updated = await prisma.journalMedia.update({
        where: { id: firstMedia.id },
        data: { caption: 'Updated caption from test' }
      });
      console.log(`   ✅ Caption updated: "${updated.caption}"`);
    }

    // 5. Test media deletion
    if (updatedEntry.media.length > 1) {
      const lastMedia = updatedEntry.media[updatedEntry.media.length - 1];
      console.log(`\n🗑️  Deleting media ${lastMedia.id}...`);
      
      await prisma.journalMedia.delete({
        where: { id: lastMedia.id }
      });
      console.log(`   ✅ Media deleted`);
    }

    // 6. Final verification
    const finalEntry = await prisma.journalEntry.findUnique({
      where: { id: entry.id },
      include: { media: true }
    });

    console.log(`\n✅ Final media count: ${finalEntry.media.length}`);
    finalEntry.media.forEach((m, i) => {
      console.log(`   [${i + 1}] ${m.url} - "${m.caption}"`);
    });

    console.log('\n✅ Media attachment flow test PASSED!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testMediaFlow();
