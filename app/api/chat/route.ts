import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get or create the default "Muffin 🧁" room
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

    // If it's a user message, generate an AI response
    if (role === 'user' && triggerLLM !== false) {
      console.log(`Thinking with Ollama (gemma2) for text message: "${content.substring(0, 50)}..."`);
      try {
        const systemPrompt = `You are Muffin, a sharp, resourceful studio assistant for Tom.
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

        Reply concisely. Keep it under 2 sentences. 🧁`;

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
          const assistantContent = ollamaData.response;
          console.log('Ollama responded successfully.');
          
          // Extract action
          let action = null;
          const actionMatch = assistantContent.match(/\[\[ACTION:\s*({.*?})\]\]/);
          if (actionMatch) {
            try {
              action = JSON.parse(actionMatch[1]);
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

          const assistantMsg = await prisma.chatMessage.create({
            data: {
              content: assistantContent,
              role: 'assistant',
              roomId,
            }
          });
          
          return NextResponse.json({ userMsg: message, assistantMsg, action });
        }
      } catch (err) {
        console.error('Ollama failed for text chat:', err);
      }
    }

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Chat POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
