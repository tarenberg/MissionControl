import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runInference } from '@/lib/chatEngine';

const LOCAL_AI_URL = 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const roomId = formData.get('roomId') as string;

    if (!audioBlob || !roomId) {
      return NextResponse.json({ error: 'Missing audio or roomId' }, { status: 400 });
    }

    const sttFormData = new FormData();
    sttFormData.append('audio', audioBlob, 'speech.webm');

    const sttRes = await fetch(`${LOCAL_AI_URL}/stt`, {
      method: 'POST',
      body: sttFormData,
    });

    if (!sttRes.ok) {
      throw new Error(`Local STT failed: ${sttRes.statusText}`);
    }

    const { text: transcript } = await sttRes.json();
    if (!transcript || transcript.trim() === '') {
      return NextResponse.json({ error: 'No speech detected' }, { status: 200 });
    }

    const userMsg = await prisma.chatMessage.create({
      data: {
        content: transcript,
        role: 'user',
        roomId,
      },
    });

    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    const triggerLLM = formData.get('triggerLLM') as string;
    if (triggerLLM === 'false') {
      return NextResponse.json({ userMsg });
    }

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    const roomName = room?.name || 'Muffin';

    const inference = await runInference({
      roomId,
      roomName,
      userContent: transcript,
      voiceMode: true,
    });

    let assistantContent = inference.assistantContent;
    const action = inference.action;

    if (!assistantContent.includes('(VAT Chat Local Mode Active)')) {
      assistantContent += '\n\n(VAT Chat Local Mode Active)';
    }

    const assistantMsg = await prisma.chatMessage.create({
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

    const ttsContent = assistantContent.replace(/\[\[ACTION:.*?\]\]/g, '').replace(/\(VAT Chat Local Mode Active\)/, '').trim();
    const ttsFormData = new FormData();
    ttsFormData.append('text', ttsContent);

    const ttsRes = await fetch(`${LOCAL_AI_URL}/tts`, {
      method: 'POST',
      body: ttsFormData,
    });

    let audioBase64 = null;
    if (ttsRes.ok) {
      const audioBuffer = await ttsRes.arrayBuffer();
      audioBase64 = Buffer.from(audioBuffer).toString('base64');
    }

    return NextResponse.json({
      userMsg,
      assistantMsg,
      action,
      audioBase64: audioBase64 ? `data:audio/wav;base64,${audioBase64}` : null
    });
  } catch (err: any) {
    console.error('Voice API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

