import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';

interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  model: string;
  state: 'busy' | 'waiting' | 'failed' | 'idle';
  currentTask?: string;
  lastActiveTime?: string;
  subagents: string[];
}

const EMOJIS: Record<string, string> = {
  main: '🧁',
  jason: '⚙️',
  pixels: '🎨',
  housekeeper: '🏠',
};

export async function GET() {
  try {
    const configContent = readFileSync('C:\\Users\\tberg\\.openclaw\\openclaw.json', 'utf-8');
    const config = JSON.parse(configContent);

    const agentList: { id: string; name: string }[] = config.agents?.list || [];
    const defaultModel: string = config.agents?.defaults?.model?.primary || 'unknown';

    const agentStatuses: AgentStatus[] = agentList.map((agent) => {
      let subagents: string[] = [];
      if (agent.id === 'main') {
        subagents = ['jason', 'housekeeper'];
      } else if (agent.id === 'jason') {
        subagents = ['pixels'];
      }

      return {
        id: agent.id,
        name: agent.name,
        emoji: EMOJIS[agent.id] ?? '🤖',
        model: defaultModel,
        state: 'idle',
        currentTask: undefined,
        lastActiveTime: undefined,
        subagents,
      };
    });

    return NextResponse.json(agentStatuses);
  } catch (error) {
    console.error('[GET /api/agents]', error);
    // Hard fallback — never return 500 to the page
    return NextResponse.json([
      { id: 'main', name: 'Muffin', emoji: '🧁', model: 'claude-haiku-4-5', state: 'idle', subagents: ['jason', 'pixels', 'housekeeper'] },
      { id: 'jason', name: 'Jason', emoji: '⚙️', model: 'claude-sonnet-4-6', state: 'idle', subagents: [] },
      { id: 'pixels', name: 'Pixels', emoji: '🎨', model: 'claude-sonnet-4-6', state: 'idle', subagents: [] },
      { id: 'housekeeper', name: 'Housekeeper', emoji: '🏠', model: 'ollama/gemma2-32k', state: 'idle', subagents: [] },
    ]);
  }
}
