import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fetch weather from wttr.in with abort timeout
async function fetchWeather(location: string): Promise<string | null> {
  if (!location) return null;
  try {
    const encodedLoc = encodeURIComponent(location);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`https://wttr.in/${encodedLoc}?format=%c+%t`, {
      signal: controller.signal,
    });
    clearTimeout(id);

    if (response.ok) {
      const text = await response.text();
      return text.trim();
    }
    return null;
  } catch (err) {
    console.warn('[journal] Weather fetch timed out or failed:', err);
    return null;
  }
}

// GET: Fetch timeline of entries
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const mood = searchParams.get('mood') || '';
    const lite = searchParams.get('lite') === '1';
    const takeParam = Number.parseInt(searchParams.get('take') || '20', 10);
    const skipParam = Number.parseInt(searchParams.get('skip') || '0', 10);
    const skip = Number.isFinite(skipParam) ? Math.max(skipParam, 0) : 0;
    const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 50) : 20;
    console.log(`[journal GET] lite=${lite}, take=${take}, skip=${skip}, search='${search}', mood='${mood}`);

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { location: { contains: search } },
      ];
    }

    if (mood && mood !== 'All') {
      where.mood = mood;
    }

    const entries = lite
      ? await prisma.journalEntry.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take,
          select: {
            id: true,
            title: true,
            content: true,
            mood: true,
            location: true,
            createdAt: true,
            media: {
              select: {
                id: true,
                url: true,
                type: true,
                caption: true,
                filename: true,
              },
              take: 10,
            },
            _count: {
              select: {
                media: true,
              },
            },
          },
        })
      : await prisma.journalEntry.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take,
          skip,
          include: {
            media: true,
          },
        });

    console.log(`[journal GET] Returned ${entries.length} entries`);

    return NextResponse.json({ success: true, entries, count: entries.length });
  } catch (error: any) {
    console.error('[journal GET] Error fetching journal:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch journal.' }, { status: 500 });
  }
}

// POST: Create a new journal entry
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, content, mood, location, media } = data;

    if (!content) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    // Resolve location (fallback to New Haven, CT)
    const activeLocation = location ? location.trim() : 'New Haven, CT';

    // Fetch weather asynchronously with a timeout guard
    const weather = await fetchWeather(activeLocation);

    // Create journal entry with nested media relationships
    const entry = await prisma.journalEntry.create({
      data: {
        title: title || null,
        content,
        mood: mood || null,
        location: activeLocation,
        weather,
        media: media && media.length > 0 ? {
          create: media.map((m: any) => ({
            url: m.url,
            type: m.type,
            filename: m.filename || 'media',
          })),
        } : undefined,
      },
      include: {
        media: true,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({ error: error.message || 'Failed to create entry.' }, { status: 500 });
  }
}
