import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getPersonaPrompt } from '@/lib/chatPersona';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);

export interface ChatAction {
  type: string;
  [key: string]: unknown;
}

export interface ChatInferenceResult {
  assistantContent: string;
  action: ChatAction | null;
  engine: 'ollama' | 'gemini' | 'acpx';
  dbMessageCreated?: boolean;
}

function stripAnsi(str: string): string {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

interface BuildContextOptions {
  roomId: string;
  userContent: string;
  maxMessages?: number;
  historyFetch?: number;
}

const DEFAULT_MODEL = process.env.VAT_CHAT_OLLAMA_MODEL || 'gemma2';
const MODE = (process.env.VAT_CHAT_MODE || 'hybrid').toLowerCase(); // local | hybrid | cloud
const GEMINI_MODEL = process.env.VAT_CHAT_GEMINI_MODEL || 'gemini-2.5-flash';

export async function buildConversationContext(options: BuildContextOptions): Promise<string> {
  const { roomId, userContent, maxMessages = 24, historyFetch = 96 } = options;
  const history = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: historyFetch,
  });

  const ordered = history.reverse();
  const recent = ordered.slice(-maxMessages);
  const older = ordered.slice(0, Math.max(0, ordered.length - maxMessages));

  const summarizeOlder = (messages: typeof older): string[] => {
    if (messages.length === 0) return [];
    const summaryLines = messages
      .slice(-10)
      .map((m) => {
        const role = m.role === 'assistant' ? 'Assistant' : 'User';
        const compact = m.content.replace(/\s+/g, ' ').trim().slice(0, 180);
        return `- ${role}: ${compact}${m.content.length > 180 ? '...' : ''}`;
      });

    return [
      `Conversation summary (${messages.length} earlier messages):`,
      ...summaryLines,
    ];
  };

  const lines = [
    ...summarizeOlder(older),
    ...recent.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`),
  ];
  lines.push(`User: ${userContent}`);
  lines.push('Assistant:');
  return lines.join('\n');
}

async function inferWithGemini(systemPrompt: string, prompt: string): Promise<string | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';
  if (!apiKey) return null;

  const genAI = new GoogleGenAI({ apiKey });
  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
  });

  const text = response.text?.trim();
  return text || null;
}

async function inferWithOllama(prompt: string): Promise<string | null> {
  const ollamaRes = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!ollamaRes.ok) return null;
  const ollamaData = await ollamaRes.json();
  return ollamaData.response || null;
}

export function extractAction(assistantContent: string): ChatAction | null {
  const actionMatch = assistantContent.match(/\[\[ACTION:\s*({.*?})\]\]/);
  if (actionMatch) {
    try {
      return JSON.parse(actionMatch[1]);
    } catch {
      return null;
    }
  }

  const lowerContent = assistantContent.toLowerCase();
  if (lowerContent.includes('navigate') || lowerContent.includes('go to') || lowerContent.includes('open') || lowerContent.includes('show')) {
    if (lowerContent.includes('project')) return { type: 'NAVIGATE', path: '/projects' };
    if (lowerContent.includes('art') || lowerContent.includes('tracker')) return { type: 'NAVIGATE', path: '/art-tracker' };
    if (lowerContent.includes('task') || lowerContent.includes('todo') || lowerContent.includes('to-do')) return { type: 'NAVIGATE', path: '/tasks' };
    if (lowerContent.includes('calendar')) return { type: 'NAVIGATE', path: '/calendar' };
    if (lowerContent.includes('memory') || lowerContent.includes('palace')) return { type: 'NAVIGATE', path: '/memory' };
    if (lowerContent.includes('ops') || lowerContent.includes('system') || lowerContent.includes('control')) return { type: 'NAVIGATE', path: '/ops' };
  }

  return null;
}

function detectAgent(roomName: string): string | null {
  const name = roomName.toLowerCase();
  
  if (name.includes('vibecoding') || name.includes('vibe coding')) {
    return 'codex';
  }
  
  if (name.includes('jason')) return 'jason';
  if (name.includes('claude code') || name === 'claude' || name.includes('claude-code')) return 'claude';
  if (name.includes('codex')) return 'codex';
  if (name.includes('copilot')) return 'copilot';
  if (name.includes('cursor')) return 'cursor';
  if (name.includes('pi')) return 'pi';
  if (name.includes('gemini')) return 'gemini';
  if (name.includes('openclaw')) return 'openclaw';
  
  return null;
}

export async function runInference(params: {
  roomId: string;
  roomName: string;
  userContent: string;
  voiceMode?: boolean;
}): Promise<ChatInferenceResult> {
  const { roomId, roomName, userContent, voiceMode = false } = params;

  // 1. Check if the room name designates an ACPX coding agent (for vibecoding)
  const agentId = detectAgent(roomName);
  if (agentId) {
    const sessionName = `vat-${roomId.slice(-12)}`;
    const workspacePath = `C:\\Users\\tberg\\Documents\\_PROJECTS`;
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `vat-prompt-${roomId}.txt`);
    
    try {
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      const systemInstruction = `[SYSTEM INSTRUCTION: You are a coding assistant running in the root workspace directory: C:\\Users\\tberg\\Documents\\_PROJECTS
The primary project "MissionControl" is located in the "MissionControl" subdirectory (C:\\Users\\tberg\\Documents\\_PROJECTS\\MissionControl).
When asked to inspect, read, or edit files in "MissionControl" or "Mission Control" (or any files like components/, app/, etc. which are part of MissionControl), you MUST navigate into or reference the "MissionControl" folder first (e.g., run commands or find files under "C:\\Users\\tberg\\Documents\\_PROJECTS\\MissionControl" or "MissionControl/").
Other projects in the same workspace include ArtTrackerDashboard, AI-Engines, Chronicles, etc.
Always check and verify file paths before reading or editing.]

User Request: ${userContent}`;

      await fs.promises.writeFile(tempFilePath, systemInstruction, 'utf-8');

      // Ensure the session exists
      const ensureCmd = `acpx --cwd "${workspacePath}" ${agentId} sessions ensure --name "${sessionName}"`;
      await execPromise(ensureCmd);

      // Create the initial assistant message in the database so we can stream progress
      const assistantMsg = await prisma.chatMessage.create({
        data: {
          content: `🤖 [VibeCoding] Initiating session for agent "${agentId}"...`,
          role: 'assistant',
          roomId,
        },
      });

      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      // Run the prompt using explicit prompt command to exit on complete
      const args = [
        '--approve-all',
        '--format', 'quiet',
        '--cwd', workspacePath,
        agentId,
        'prompt',
        '-s', sessionName,
        '-f', tempFilePath
      ];

      const child = spawn('acpx', args, { shell: true, env: process.env });

      let accumulatedOutput = '';
      let lastUpdateTs = Date.now();
      let dbUpdatePromise: Promise<any> = Promise.resolve();

      const updateDb = async (final = false) => {
        if (!final && Date.now() - lastUpdateTs < 1200) {
          return;
        }
        lastUpdateTs = Date.now();

        await dbUpdatePromise;

        const cleanText = stripAnsi(accumulatedOutput).trim();
        const displayContent = cleanText || `🤖 [VibeCoding] Agent "${agentId}" running...`;

        dbUpdatePromise = (async () => {
          try {
            await prisma.chatMessage.update({
              where: { id: assistantMsg.id },
              data: { content: displayContent },
            });
            await prisma.chatRoom.update({
              where: { id: roomId },
              data: { updatedAt: new Date() },
            });
          } catch (e) {
            console.error('Failed to stream vibe coding progress to DB:', e);
          }
        })();

        await dbUpdatePromise;
      };

      child.stdout.on('data', (chunk) => {
        accumulatedOutput += chunk.toString();
        updateDb(false).catch(console.error);
      });

      child.stderr.on('data', (chunk) => {
        accumulatedOutput += chunk.toString();
        updateDb(false).catch(console.error);
      });

      child.on('error', (err) => {
        accumulatedOutput += `\nError spawning process: ${err.message}`;
        updateDb(true).catch(console.error);
      });

      await new Promise<void>((resolve) => {
        child.on('close', () => {
          resolve();
        });
      });

      await updateDb(true);

      try {
        await prisma.agentLog.create({
          data: {
            agentId: `vat-chat:acpx:${agentId}`,
            level: 'info',
            subsystem: 'vat-chat',
            message: `room=${roomName} mode=acpx agent=${agentId} chars=${userContent.length}`,
          },
        });
      } catch {}

      return {
        assistantContent: stripAnsi(accumulatedOutput).trim() || `No output received from ${agentId} agent.`,
        action: null,
        engine: 'acpx',
        dbMessageCreated: true
      };
    } catch (err: any) {
      console.error(`acpx execution failed:`, err);
      return {
        assistantContent: `Failed to execute coding action: ${err.message}`,
        action: null,
        engine: 'acpx'
      };
    } finally {
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (unlinkErr) {
        console.error('Failed to clean up temp file:', unlinkErr);
      }
    }
  }

  const systemPrompt = getPersonaPrompt(roomName, voiceMode);
  const conversation = await buildConversationContext({ roomId, userContent });

  const userPrompt = `System: ${systemPrompt}\n${conversation}`;

  let engine: 'ollama' | 'gemini' | 'acpx' = 'ollama';
  let assistantContent: string | null = null;

  // Gemini-first for hybrid/cloud, local-only when explicitly requested.
  if (MODE !== 'local') {
    try {
      assistantContent = await inferWithGemini(systemPrompt, conversation);
      if (assistantContent) engine = 'gemini';
    } catch {
      assistantContent = null;
    }
  }

  if (!assistantContent && MODE !== 'cloud') {
    try {
      assistantContent = await inferWithOllama(userPrompt);
      engine = 'ollama';
    } catch {
      assistantContent = null;
    }
  }

  if (!assistantContent) {
    assistantContent = 'Error communicating with chat model. Check local model services.';
  }

  try {
    await prisma.agentLog.create({
      data: {
        agentId: `vat-chat:${engine}`,
        level: 'info',
        subsystem: 'vat-chat',
        message: `room=${roomName} mode=${MODE} engine=${engine} chars=${userContent.length}`,
      },
    });
  } catch {
    // Non-blocking telemetry.
  }

  const action = extractAction(assistantContent);
  return { assistantContent, action, engine };
}
