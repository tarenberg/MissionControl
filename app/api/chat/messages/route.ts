import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runInference } from '@/lib/chatEngine';

const LOCAL_AI_URL = 'http://localhost:8000';

async function runSlashCommand(command: string, roomId: string) {
  const cmd = command.trim().toLowerCase();

  if (cmd === '/reset') {
    await prisma.chatMessage.deleteMany({ where: { roomId } });
    const assistantMsg = await prisma.chatMessage.create({
      data: { content: 'Conversation history cleared.', role: 'assistant', roomId },
    });
    return { assistantMsg, action: null as any };
  }

  if (cmd === '/status') {
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        content: `System Status
- Gateway: HEARTBEAT_OK
- Local LLM: Available
- STT: Whisper local endpoint
- TTS: Piper local endpoint
- Transport: SQLite + realtime stream`,
        role: 'assistant',
        roomId,
      },
    });
    return { assistantMsg, action: null as any };
  }

  if (cmd === '/logs') {
    const recent = await prisma.agentLog.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
    const rendered = recent.length
      ? recent.reverse().map((r) => `[${r.createdAt.toISOString()}] [${r.level}] ${r.message}`).join('\n')
      : 'No recent logs.';

    const assistantMsg = await prisma.chatMessage.create({
      data: {
        content: `System logs (last 3)\n\`\`\`\n${rendered}\n\`\`\``,
        role: 'assistant',
        roomId,
      },
    });
    return { assistantMsg, action: null as any };
  }

  if (cmd === '/help') {
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        content: `VAT Chat commands
- /status: runtime status
- /logs: latest system logs
- /reset: clear room history
- /help: this guide`,
        role: 'assistant',
        roomId,
      },
    });
    return { assistantMsg, action: null as any };
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId parameter' }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Messages GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, role = 'user', roomId, mute = true, triggerLLM = true } = await req.json();

    if (!content || !roomId) {
      return NextResponse.json({ error: 'Missing content or roomId' }, { status: 400 });
    }

    const userMsg = await prisma.chatMessage.create({
      data: {
        content,
        role,
        roomId,
      },
    });

    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    if (role !== 'user' || triggerLLM === false) {
      return NextResponse.json({ userMsg });
    }

    const slashResult = await runSlashCommand(content, roomId);
    if (slashResult) {
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });
      return NextResponse.json({ userMsg, assistantMsg: slashResult.assistantMsg, action: slashResult.action, audioBase64: null });
    }

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    const roomName = room?.name || 'Muffin';

    const inference = await runInference({
      roomId,
      roomName,
      userContent: content,
      voiceMode: false,
    });

    const action = inference.action;
    let assistantMsg;

    if (inference.dbMessageCreated) {
      assistantMsg = await prisma.chatMessage.findFirst({
        where: { roomId, role: 'assistant' },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      let assistantContent = inference.assistantContent;
      if (!assistantContent.includes('(VAT Chat Local Mode Active)')) {
        assistantContent += '\n\n(VAT Chat Local Mode Active)';
      }

      assistantMsg = await prisma.chatMessage.create({
        data: {
          content: assistantContent,
          role: 'assistant',
          roomId,
        },
      });

      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });
    }

    let audioBase64 = null;
    if (!mute && assistantMsg) {
      try {
        const ttsContent = assistantMsg.content.replace(/\[\[ACTION:.*?\]\]/g, '').replace(/\(VAT Chat Local Mode Active\)/g, '').trim();
        const ttsFormData = new FormData();
        ttsFormData.append('text', ttsContent);

        const ttsRes = await fetch(`${LOCAL_AI_URL}/tts`, {
          method: 'POST',
          body: ttsFormData,
        });

        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer();
          audioBase64 = `data:audio/wav;base64,${Buffer.from(audioBuffer).toString('base64')}`;
        }
      } catch (err) {
        console.error('Local TTS service failed:', err);
      }
    }

    return NextResponse.json({
      userMsg,
      assistantMsg,
      action,
      audioBase64,
    });
  } catch (error: any) {
    console.error('Messages POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

