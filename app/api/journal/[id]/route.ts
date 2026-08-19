import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { backupEntry, backupDeletion } from '@/lib/backup';

// Fetch weather from wttr.in with historical date support
async function fetchWeather(location: string, date?: Date): Promise<string | null> {
  if (!location) return null;
  try {
    const encodedLoc = encodeURIComponent(location);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5s for historical data

    let url = `https://wttr.in/${encodedLoc}?format=%c+%t`;
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      url = `https://wttr.in/${encodedLoc}?date=${dateStr}&format=%c+%t`;
    }

    console.log(`📡 Fetching: ${url}`);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const text = (await response.text()).trim();
      console.log(`📥 Response: ${text}`);
      return text;
    }
    console.warn(`⚠️ Weather API returned status ${response.status}`);
    return null;
  } catch (err: any) {
    console.warn('❌ Weather fetch failed:', err.message);
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { title, content, mood, location, weather, createdAt, media } = data;

    console.log(`[PATCH] Processing entry ${id}`);
    console.log(`[PATCH] Received media array:`, media);

    // If date changed, fetch weather for that date
    let shouldUpdateWeather = false;
    let updatedWeather = weather;
    
    if (createdAt !== undefined) {
      const newDate = new Date(createdAt);
      const currentEntry = await prisma.journalEntry.findUnique({ where: { id } });
      const loc = location || currentEntry?.location || 'New Haven, CT';
      
      console.log(`🌤️ Fetching weather for ${loc} on ${newDate.toISOString().split('T')[0]}...`);
      updatedWeather = await fetchWeather(loc, newDate);
      shouldUpdateWeather = true;
      console.log(`✅ Weather result: ${updatedWeather || 'null'}`);
    }

    // First, fetch the current entry with media to track changes
    const currentEntry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { media: true },
    });

    if (!currentEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Process media array if provided
    if (Array.isArray(media)) {
      console.log(`[PATCH] Processing ${media.length} media items`);
      
      const newMediaIds = new Set(
        media
          .filter((m: any) => m.id && typeof m.id === 'string')
          .map((m: any) => m.id)
      );

      // Find media to delete (in current but not in new)
      const mediaToDelete = currentEntry.media.filter((m) => !newMediaIds.has(m.id));
      console.log(`[PATCH] Deleting ${mediaToDelete.length} removed media items`);

      // Delete removed media
      for (const m of mediaToDelete) {
        try {
          const filePath = join(process.cwd(), 'public', m.url);
          await unlink(filePath);
          console.log(`[PATCH] Deleted file: ${m.url}`);
        } catch (err) {
          console.warn(`[PATCH] Could not delete physical file: ${m.url}`, err);
        }
        await prisma.journalMedia.delete({ where: { id: m.id } });
      }

      // Update captions on existing media and create new ones
      for (const m of media) {
        if (m.id && currentEntry.media.find((x) => x.id === m.id)) {
          // Update existing media caption
          console.log(`[PATCH] Updating media ${m.id} caption to: ${m.caption}`);
          await prisma.journalMedia.update({
            where: { id: m.id },
            data: { caption: m.caption || null },
          });
        } else if (!m.id && m.url) {
          // Create new media (already uploaded)
          console.log(`[PATCH] Creating new media for URL: ${m.url}`);
          await prisma.journalMedia.create({
            data: {
              url: m.url,
              type: m.type || 'image/jpeg',
              filename: m.filename || m.url.split('/').pop() || 'media',
              caption: m.caption || null,
              journalEntryId: id,
            },
          });
        }
      }
    }

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title || null }),
        ...(content !== undefined && { content }),
        ...(mood !== undefined && { mood: mood || null }),
        ...(location !== undefined && { location: location || null }),
        ...(createdAt !== undefined && { createdAt: new Date(createdAt) }),
        ...(shouldUpdateWeather && { weather: updatedWeather }),
      },
      include: { media: true },
    });

    // Auto-backup after update
    await backupEntry(entry);

    console.log(`[PATCH] Entry ${id} updated successfully with ${entry.media.length} media items`);
    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error(`[PATCH /api/journal/[id]]`, error);
    return NextResponse.json({ error: error.message || 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch entry and its linked media files
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { media: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // 2. Unlink/delete physical files on disk to prevent storage leaks
    for (const m of entry.media) {
      try {
        // Resolve path to public asset
        const filePath = join(process.cwd(), 'public', m.url);
        await unlink(filePath);
      } catch (err) {
        console.warn('Could not delete physical file:', m.url, err);
      }
    }

    // 3. Backup before deletion (tombstone)
    await backupDeletion(id, entry);

    // 4. Delete database record
    await prisma.journalEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE /api/journal/[id]]`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete entry' }, { status: 500 });
  }
}
