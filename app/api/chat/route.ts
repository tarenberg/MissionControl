import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runInference } from '@/lib/chatEngine';

export async function GET() {
  try {
    let room = await prisma.chatRoom.findFirst({
      where: { name: 'Muffin 🧁' }
    });

    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          name: 'Muffin 🧁',
          type: 'direct',
        }
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ room, messages });
  } catch (error: any) {
    console.error('Chat GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { content, role, roomId, triggerLLM = true } = await req.json();

    if (!content || !role || !roomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        content,
        role,
        roomId,
      }
    });

    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    if (role === 'user' && triggerLLM !== false) {
      const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
      const roomName = room?.name || 'Muffin';
      const inference = await runInference({
        roomId,
        roomName,
        userContent: content,
        voiceMode: false,
      });

      const assistantMsg = await prisma.chatMessage.create({
        data: {
          content: inference.assistantContent,
          role: 'assistant',
          roomId,
        }
      });

      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({ userMsg: message, assistantMsg, action: inference.action });
    }

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Chat POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

