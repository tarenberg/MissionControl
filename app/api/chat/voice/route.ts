import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LOCAL_AI_URL = 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const roomId = formData.get('roomId') as string;

    if (!audioBlob || !roomId) {
      return NextResponse.json({ error: 'Missing audio or roomId' }, { status: 400 });
    }

    // --- WHISPER STT ---
    const sttFormData = new FormData();
    sttFormData.append('audio', audioBlob, 'speech.webm');

    console.log('Sending audio to local STT...');
    const sttRes = await fetch(`${LOCAL_AI_URL}/stt`, {
      method: 'POST',
      body: sttFormData,
    });

    if (!sttRes.ok) {
      throw new Error(`Local STT failed: ${sttRes.statusText}`);
    }

    const { text: transcript } = await sttRes.json();
    console.log('Transcript received:', transcript);

    if (!transcript || transcript.trim() === '') {
      return NextResponse.json({ error: 'No speech detected' }, { status: 200 });
    }

    // Save User Message
    const userMsg = await prisma.chatMessage.create({
      data: {
        content: transcript,
        role: 'user',
        roomId,
      },
    });

    const triggerLLM = formData.get('triggerLLM') as string;
    if (triggerLLM === 'false') {
      return NextResponse.json({ userMsg });
    }

    // --- LLM PROCESSING (Ollama) ---
    console.log('Thinking with Ollama (gemma2)...');
    const systemPrompt = `You are Muffin, a sharp, resourceful studio assistant for Tom.
    Available Tools:
    - /art-tracker (Art inventory, sales, shows)
    - /projects (Active development and business projects)
    - /tasks (Todo list)
    - /calendar (Deadlines and show dates)
    - /memory (Personal/Studio knowledge base)

    Tom just said: "${transcript}"

    If Tom asks to open or go to a tool, include a command at the end of your response in exactly this format: [[ACTION: {"type": "NAVIGATE", "path": "/target-path"}]]
    If Tom asks to search for something in the art tracker: [[ACTION: {"type": "SEARCH", "target": "ART_TRACKER", "query": "search query"}]]
    If Tom asks to switch view in art tracker: [[ACTION: {"type": "TOGGLE_VIEW", "target": "ART_TRACKER", "mode": "grid"}]]
    If Tom asks to scan a painting or start a scan: [[ACTION: {"type": "OPEN_MODAL", "target": "STUDIO_SCAN"}]]

    Reply concisely. Keep the spoken part under 2 sentences. 🧁`;

    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'gemma2',
        prompt: systemPrompt,
        stream: false
      }),
    });

    let assistantContent = `I heard you! You said: "${transcript}" 🧁`;
    if (ollamaRes.ok) {
      const ollamaData = await ollamaRes.json();
      assistantContent = ollamaData.response;
    }

    // Extract action before TTS
    let action = null;
    const actionMatch = assistantContent.match(/\[\[ACTION:\s*({.*?})\]\]/);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
        // Remove the action tag from the content that goes to TTS/UI display (or keep for UI parsing)
        // assistantContent = assistantContent.replace(actionMatch[0], '').trim();
      } catch (e) {
        console.error('Failed to parse action JSON:', e);
      }
    }

    // Resilient Fallback Parser
    if (!action) {
      const lowerContent = assistantContent.toLowerCase();
      if (lowerContent.includes('navigate') || lowerContent.includes('go to') || lowerContent.includes('open') || lowerContent.includes('show')) {
        if (lowerContent.includes('project')) {
          action = { type: 'NAVIGATE', path: '/projects' };
        } else if (lowerContent.includes('art') || lowerContent.includes('tracker')) {
          action = { type: 'NAVIGATE', path: '/art-tracker' };
        } else if (lowerContent.includes('task') || lowerContent.includes('todo') || lowerContent.includes('to-do')) {
          action = { type: 'NAVIGATE', path: '/tasks' };
        } else if (lowerContent.includes('calendar')) {
          action = { type: 'NAVIGATE', path: '/calendar' };
        } else if (lowerContent.includes('memory') || lowerContent.includes('palace')) {
          action = { type: 'NAVIGATE', path: '/memory' };
        } else if (lowerContent.includes('ops') || lowerContent.includes('system') || lowerContent.includes('control')) {
          action = { type: 'NAVIGATE', path: '/ops' };
        }
      }
    }

    // Append the local mode tagline for consistency
    if (!assistantContent.includes('(VAT Chat Local Mode Active)')) {
      assistantContent += "\n\n(VAT Chat Local Mode Active)";
    }

    // Save Assistant Message
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        content: assistantContent,
        role: 'assistant',
        roomId,
      },
    });

    // --- PIPER TTS ---
    console.log('Generating local TTS...');
    // Clean content for TTS (remove action tags)
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
