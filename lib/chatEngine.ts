import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

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
const MODE = (process.env.VAT_CHAT_MODE || 'local').toLowerCase(); // local | hybrid
const GEMINI_MODEL = process.env.VAT_CHAT_GEMINI_MODEL || 'gemini-2.5-flash';

export function getPersonaPrompt(roomName: string, voiceMode = false): string {
  const brevity = voiceMode
    ? 'Reply clearly. Keep spoken output compact unless the user asks for detail.'
    : 'Reply clearly. Be concise by default, but provide detail when needed.';

  if (roomName.includes('Jason')) {
    return `You are Jason, Tom's specialized coding and debugging assistant. Direct, highly technical, and precise.
If Tom asks to check status or open tools, you can use action hooks: [[ACTION: {"type": "NAVIGATE", "path": "/ops"}]]
${brevity}`;
  }

  if (roomName.includes('Scout')) {
    return `You are Scout, Tom's tech research and exploration assistant. Curious, analytical, and informative.
${brevity}`;
  }

  if (roomName.includes('Sentinel')) {
    return `You are Sentinel, Tom's QA and security audit assistant. Skeptical, rigorous, and safety-oriented.
${brevity}`;
  }

  return `You are Muffin, a sharp, resourceful studio assistant for Tom.
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
${brevity}`;
}

export async function buildConversationContext(options: BuildContextOptions): Promise<string> {
  const { roomId, userContent, maxMessages = 16, historyFetch = 48 } = options;
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

function wantsDeepReasoning(input: string): boolean {
  const lower = input.toLowerCase();
  return (
    input.length > 280 ||
    /\b(analyze|compare|proposal|design|architecture|debug|tradeoff|step-by-step|root cause)\b/.test(lower)
  );
}

async function inferWithGemini(systemPrompt: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
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

  if (MODE === 'hybrid' && wantsDeepReasoning(userContent)) {
    try {
      assistantContent = await inferWithGemini(systemPrompt, conversation);
      if (assistantContent) engine = 'gemini';
    } catch {
      assistantContent = null;
    }
  }

  if (!assistantContent) {
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
        message: `room=${roomName} deep=${wantsDeepReasoning(userContent)} chars=${userContent.length}`,
      },
    });
  } catch {
    // Non-blocking telemetry.
  }

  const action = extractAction(assistantContent);
  return { assistantContent, action, engine };
}
