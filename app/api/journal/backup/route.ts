import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/journal/backup
 * Export all journal entries as JSON backup file
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all entries from backend
    const backendUrl = process.env.JOURNEY_SYNC_URL || 'http://localhost:3002';
    const response = await fetch(`${backendUrl}/api/entries?skip=0&take=10000`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entries: ${response.status}`);
    }

    const { entries } = await response.json();

    // Create backup object
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries: entries,
    };

    // Return as downloadable JSON
    const filename = `journey-sync-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Backup failed',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journal/backup/restore
 * Restore journal entries from backup JSON
 * Form data: file (JSON backup file)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse JSON
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.entries || !Array.isArray(backup.entries)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup format: missing entries array' },
        { status: 400 }
      );
    }

    // Restore entries
    const backendUrl = process.env.JOURNEY_SYNC_URL || 'http://localhost:3002';
    const results = {
      total: backup.entries.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const entry of backup.entries) {
      try {
        const payload = {
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          location: entry.location,
          weather: entry.weather,
          tags: entry.tags,
          date: entry.date,
          media: entry.media || [],
        };

        // Try to update first (if ID exists), then create
        let response;
        if (entry.id) {
          response = await fetch(`${backendUrl}/api/entries/${entry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            results.updated++;
          } else {
            throw new Error(`Update failed: ${response.status}`);
          }
        } else {
          response = await fetch(`${backendUrl}/api/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            results.created++;
          } else {
            throw new Error(`Create failed: ${response.status}`);
          }
        }
      } catch (err) {
        results.failed++;
        results.errors.push(
          `Entry "${entry.title}": ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      message: `Restored ${results.created} new entries, updated ${results.updated}`,
      results,
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      },
      { status: 500 }
    );
  }
}
