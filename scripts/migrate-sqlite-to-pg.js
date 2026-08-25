const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const sqlite = new sqlite3.Database(path.join(__dirname, '../data/mission-control.db'));
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Starting SQLite → PostgreSQL migration...');

    // Get all tables
    const tables = await new Promise((resolve, reject) => {
      sqlite.all(
        `SELECT name FROM sqlite_master WHERE type='table'`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.name));
        }
      );
    });

    console.log('Tables to migrate:', tables);

    // Migrate JournalEntry records
    const entries = await new Promise((resolve, reject) => {
      sqlite.all('SELECT * FROM JournalEntry', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log(`Migrating ${entries.length} journal entries...`);
    for (const entry of entries) {
      try {
        await prisma.journalEntry.create({
          data: {
            id: entry.id,
            title: entry.title,
            content: entry.content,
            mood: entry.mood,
            location: entry.location,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          },
        });
      } catch (e) {
        if (e.code === 'P2002') {
          console.log(`  → Skipping entry ${entry.id} (already exists)`);
        } else throw e;
      }
    }

    // Migrate JournalMedia records
    const media = await new Promise((resolve, reject) => {
      sqlite.all('SELECT * FROM JournalMedia', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log(`Migrating ${media.length} media records...`);
    for (const m of media) {
      try {
        const updatedAt = m.updatedAt && !isNaN(new Date(m.updatedAt).getTime()) ? new Date(m.updatedAt) : new Date(m.createdAt);
        await prisma.journalMedia.create({
          data: {
            id: m.id,
            url: m.url,
            type: m.type,
            caption: m.caption || null,
            filename: m.filename,
            createdAt: new Date(m.createdAt),
            updatedAt: updatedAt,
            journalEntryId: m.journalEntryId,
          },
        });
      } catch (e) {
        if (e.code === 'P2002') {
          console.log(`  → Skipping media ${m.id} (already exists)`);
        } else {
          console.log(`  → Error with media ${m.id}:`, e.message);
        }
      }
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
  }
}

migrate();
