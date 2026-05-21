import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Seed default agents if they don't exist yet
    const defaultAgents = [
      { name: 'Muffin 🧁', type: 'direct' },
      { name: 'Jason 🛠️', type: 'direct' },
      { name: 'Scout 🔍', type: 'direct' },
      { name: 'Sentinel 🛡️', type: 'direct' },
    ];

    for (const agent of defaultAgents) {
      const exists = await prisma.chatRoom.findFirst({
        where: { name: agent.name }
      });
      if (!exists) {
        await prisma.chatRoom.create({
          data: {
            name: agent.name,
            type: agent.type,
          }
        });
      }
    }

    // Fetch all rooms with their last message
    const rooms = await prisma.chatRoom.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error('Rooms GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, type = 'direct' } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Missing room name' }, { status: 400 });
    }

    const room = await prisma.chatRoom.create({
      data: {
        name,
        type,
      }
    });

    return NextResponse.json({ room });
  } catch (error: any) {
    console.error('Rooms POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
