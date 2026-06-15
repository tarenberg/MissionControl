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
    const { title, content, mood, location, weather, createdAt } = data;

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
    });

    // Auto-backup after update (convert Date fields to ISO strings)
    await backupEntry({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    });

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

    // 3. Backup before deletion (tombstone) (convert Date fields to ISO strings)
    await backupDeletion(id, {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    });

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
