import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SimplifiedAgentStatus {
  id: string;
  status: 'Idle' | 'Busy' | 'Active' | 'Unknown';
}

// Map agentId strings → single-letter display IDs used in the UI
const AGENT_ID_MAP: Record<string, string> = {
  main: 'M',
  jason: 'J',
  pixels: 'P',
  housekeeper: 'H',
  alice: 'A',
  sage: 'S',
  herald: 'D',
};

// Reverse map for fallback (letter → agentId)
const LETTER_AGENTS = ['M', 'J', 'P', 'H', 'A', 'S', 'D'];

// Consider a session "Active" if updated within the last 30 minutes
const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

async function getAgentStatusesFromOpenClaw(): Promise<SimplifiedAgentStatus[] | null> {
  try {
    const { stdout } = await execAsync('openclaw sessions --all-agents --json', {
      timeout: 10000,
    });

    const parsed = JSON.parse(stdout);
    // The JSON can be an array directly, or an object with a sessions array
    const sessions: Array<{ agentId?: string; updatedAt?: number }> = Array.isArray(parsed)
      ? parsed
      : (parsed.sessions ?? parsed.data ?? []);

    const now = Date.now();

    // Build a map: letterId → most recent updatedAt
    const latestByLetter = new Map<string, number>();

    for (const session of sessions) {
      const agentId = session.agentId ?? '';
      const letterId = AGENT_ID_MAP[agentId.toLowerCase()];
      if (!letterId) continue;

      const updatedAt = session.updatedAt ?? 0;
      const current = latestByLetter.get(letterId) ?? 0;
      if (updatedAt > current) latestByLetter.set(letterId, updatedAt);
    }

    // Build result for all known agents
    return LETTER_AGENTS.map((id) => {
      const latest = latestByLetter.get(id);
      let status: SimplifiedAgentStatus['status'] = 'Idle';
      if (latest !== undefined) {
        status = now - latest < ACTIVE_THRESHOLD_MS ? 'Active' : 'Idle';
      }
      return { id, status };
    });
  } catch {
    return null;
  }
}

const STATIC_FALLBACK: SimplifiedAgentStatus[] = [
  { id: 'M', status: 'Active' },
  { id: 'J', status: 'Idle' },
  { id: 'P', status: 'Idle' },
  { id: 'H', status: 'Active' },
  { id: 'A', status: 'Idle' },
  { id: 'S', status: 'Idle' },
  { id: 'D', status: 'Idle' },
];

export async function GET() {
  try {
    const live = await getAgentStatusesFromOpenClaw();
    return NextResponse.json(live ?? STATIC_FALLBACK);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(STATIC_FALLBACK);
  }
}
