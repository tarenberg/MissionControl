import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return new Response('Missing roomId', { status: 400 });
  }

  let closed = false;
  let interval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastUpdatedAt = '';

      const send = (event: string, payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(toSse(event, payload)));
      };

      send('ready', { roomId });

      const initial = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { updatedAt: true },
      });
      lastUpdatedAt = initial?.updatedAt?.toISOString() || '';

      interval = setInterval(async () => {
        if (closed) return;
        try {
          const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            select: { updatedAt: true },
          });
          const current = room?.updatedAt?.toISOString() || '';
          if (current && current !== lastUpdatedAt) {
            lastUpdatedAt = current;
            send('update', { roomId, updatedAt: current });
          } else {
            send('heartbeat', { ts: Date.now() });
          }
        } catch {
          send('error', { message: 'Failed to poll room state' });
        }
      }, 1000);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  req.signal.addEventListener('abort', () => {
    closed = true;
    if (interval) clearInterval(interval);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

