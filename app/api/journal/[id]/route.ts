import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { title, content, mood, location, weather } = data;

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title || null }),
        ...(content !== undefined && { content }),
        ...(mood !== undefined && { mood: mood || null }),
        ...(location !== undefined && { location: location || null }),
        ...(weather !== undefined && { weather: weather || null }),
      },
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

    // 3. Delete database record
    await prisma.journalEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE /api/journal/[id]]`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete entry' }, { status: 500 });
  }
}
