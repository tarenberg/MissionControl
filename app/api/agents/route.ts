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
  description?: string;
  reportsTo?: string;
}

const EMOJIS: Record<string, string> = {
  M: '🧁',
  J: '⚙️',
  Sc: '🔭',
  P: '🎨',
  Se: '🛡️',
  MP: '🏛️',
  H: '🏠',
};

export async function GET() {
  try {
    const agentsContent = readFileSync('data/agents.json', 'utf-8');
    const agentList: { id: string; name: string; model: string; status: string }[] = JSON.parse(agentsContent);

    const agentStatuses: AgentStatus[] = agentList.map((agent) => {
      let subagents: string[] = [];
      let reportsTo: string | undefined = undefined;

      if (agent.id === 'M') {
        subagents = ['J', 'H', 'Sc', 'Se', 'MP'];
      } else if (agent.id === 'J') {
        subagents = ['P'];
        reportsTo = 'Muffin';
      } else if (['H', 'Sc', 'Se', 'MP'].includes(agent.id)) {
        reportsTo = 'Muffin';
      } else if (agent.id === 'P') {
        reportsTo = 'Jason';
      }

      return {
        id: agent.id,
        name: agent.name,
        emoji: EMOJIS[agent.id] ?? '🤖',
        model: agent.model,
        state: (agent.status.toLowerCase() as any) || 'idle',
        currentTask: undefined,
        lastActiveTime: undefined,
        subagents,
        description: (agent as any).description,
        reportsTo
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
