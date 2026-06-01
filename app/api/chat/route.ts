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
    const { content, role, roomId, triggerLLM = true, voice = false } = await req.json();

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
        voiceMode: voice,
      });

      let assistantMsg;
      if (inference.dbMessageCreated) {
        // Retrieve the message that was already created & updated live
        assistantMsg = await prisma.chatMessage.findFirst({
          where: { roomId, role: 'assistant' },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        assistantMsg = await prisma.chatMessage.create({
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
      }

      let audioBase64 = null;
      if (voice) {
        const LOCAL_AI_URL = 'http://localhost:8000';
        const ttsContent = inference.assistantContent.replace(/\[\[ACTION:.*?\]\]/g, '').replace(/\(VAT Chat Local Mode Active\)/, '').trim();
        const ttsFormData = new FormData();
        ttsFormData.append('text', ttsContent);

        try {
          const ttsRes = await fetch(`${LOCAL_AI_URL}/tts`, {
            method: 'POST',
            body: ttsFormData,
          });

          if (ttsRes.ok) {
            const audioBuffer = await ttsRes.arrayBuffer();
            audioBase64 = `data:audio/wav;base64,${Buffer.from(audioBuffer).toString('base64')}`;
          }
        } catch (ttsErr) {
          console.error('TTS generation failed on text route:', ttsErr);
        }
      }

      return NextResponse.json({ 
        userMsg: message, 
        assistantMsg, 
        action: inference.action,
        audioBase64
      });
    }

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Chat POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

