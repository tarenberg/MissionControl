import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listBackups, loadBackup, createSnapshot } from '@/lib/backup';

/**
 * GET /api/journal/backup - List all backup files
 * GET /api/journal/backup?file=<filename> - Load a specific backup
 * GET /api/journal/backup?snapshot=1 - Create a full snapshot of current DB
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('file');
    const snapshot = searchParams.get('snapshot') === '1';

    // Create full snapshot
    if (snapshot) {
      const entries = await prisma.journalEntry.findMany({
        orderBy: { createdAt: 'desc' },
        include: { media: true },
      });
      
      const snapshotFile = await createSnapshot(entries);
      return NextResponse.json({ 
        success: true, 
        snapshot: snapshotFile,
        count: entries.length 
      });
    }

    // Load specific backup
    if (filename) {
      const backup = await loadBackup(filename);
      if (!backup) {
        return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, backup });
    }

    // List all backups
    const backups = await listBackups();
    return NextResponse.json({ success: true, backups, count: backups.length });

  } catch (error: any) {
    console.error('[GET /api/journal/backup]', error);
    return NextResponse.json(
      { error: error.message || 'Backup operation failed' },
      { status: 500 }
    );
  }
}
