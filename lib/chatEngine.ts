import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getPersonaPrompt } from '@/lib/chatPersona';

export interface ChatAction {
  type: string;
  [key: string]: unknown;
}

export interface ChatInferenceResult {
  assistantContent: string;
  action: ChatAction | null;
  engine: 'ollama' | 'gemini';
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

export async function runInference(params: {
  roomId: string;
  roomName: string;
  userContent: string;
  voiceMode?: boolean;
}): Promise<ChatInferenceResult> {
  const { roomId, roomName, userContent, voiceMode = false } = params;
  const systemPrompt = getPersonaPrompt(roomName, voiceMode);
  const conversation = await buildConversationContext({ roomId, userContent });

  const userPrompt = `System: ${systemPrompt}\n${conversation}`;

  let engine: 'ollama' | 'gemini' = 'ollama';
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
