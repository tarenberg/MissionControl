import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LOCAL_AI_URL = 'http://localhost:8000';

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

    // Save the User Message (or any other role)
    const userMsg = await prisma.chatMessage.create({
      data: {
        content,
        role,
        roomId,
      }
    });

    // Update room's updatedAt so it bubbles up to the top of the sidebar list
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    if (role !== 'user' || triggerLLM === false) {
      return NextResponse.json({ userMsg });
    }

    // Fetch the room to identify the active agent persona
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });
    const roomName = room?.name || 'Muffin';

    // Persona Prompt selection
    let systemPrompt = `You are Muffin, a sharp, resourceful studio assistant for Tom.
    Available Tools:
    - /art-tracker (Art inventory, sales, shows)
    - /projects (Active development and business projects)
    - /tasks (Todo list)
    - /calendar (Deadlines and show dates)
    - /memory (Personal/Studio knowledge base)

    If Tom asks to open or go to a tool, include a command at the end of your response in exactly this format: [[ACTION: {"type": "NAVIGATE", "path": "/target-path"}]]
    If Tom asks to search for something in the art tracker: [[ACTION: {"type": "SEARCH", "target": "ART_TRACKER", "query": "search query"}]]
    If Tom asks to switch view in art tracker: [[ACTION: {"type": "TOGGLE_VIEW", "target": "ART_TRACKER", "mode": "grid"}]]
    If Tom asks to scan a painting or start a scan: [[ACTION: {"type": "OPEN_MODAL", "target": "STUDIO_SCAN"}]]

    Reply concisely. Keep the response under 3 sentences. 🧁`;

    if (roomName.includes('Jason')) {
      systemPrompt = `You are Jason, Tom's specialized coding and debugging assistant. Direct, highly technical, and precise. 
      If Tom asks to check status or open tools, you can use action hooks: [[ACTION: {"type": "NAVIGATE", "path": "/ops"}]]
      Reply concisely. Keep the response under 3 sentences. 🛠️`;
    } else if (roomName.includes('Scout')) {
      systemPrompt = `You are Scout, Tom's tech research and exploration assistant. Curious, analytical, and informative. 
      Reply concisely. Keep the response under 3 sentences. 🔍`;
    } else if (roomName.includes('Sentinel')) {
      systemPrompt = `You are Sentinel, Tom's QA and security audit assistant. Skeptical, rigorous, and highly safety-oriented. 
      Reply concisely. Keep the response under 3 sentences. 🛡️`;
    }

    console.log(`Thinking with Ollama (gemma2) for stand-alone room "${roomName}": "${content.substring(0, 50)}..."`);
    
    let assistantContent = `I received your message! 🧁`;
    let action = null;

    try {
      const ollamaRes = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma2',
          prompt: `System: ${systemPrompt}\nUser: ${content}\nAssistant:`,
          stream: false
        }),
      });

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json();
        assistantContent = ollamaData.response;
      }
    } catch (err) {
      console.error('Ollama connection failed for standalone messages route:', err);
      assistantContent = `Error communicating with local LLM. Check that Ollama is running.`;
    }

    // Extract dynamic actions
    const actionMatch = assistantContent.match(/\[\[ACTION:\s*({.*?})\]\]/);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch (e) {
        console.error('Failed to parse action JSON:', e);
      }
    }

    // Fallback simple parsers
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

    if (!assistantContent.includes('(VAT Chat Local Mode Active)')) {
      assistantContent += "\n\n(VAT Chat Local Mode Active)";
    }

    // Save Assistant Message
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        content: assistantContent,
        role: 'assistant',
        roomId,
      }
    });

    // Update room updatedAt once more for assistant timestamp
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    // Generate TTS base64 if not muted
    let audioBase64 = null;
    if (!mute) {
      try {
        console.log('Generating TTS for standalone page...');
        const ttsContent = assistantContent.replace(/\[\[ACTION:.*?\]\]/g, '').replace(/\(VAT Chat Local Mode Active\)/g, '').trim();
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
      audioBase64
    });

  } catch (error: any) {
    console.error('Messages POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
