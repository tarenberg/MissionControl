import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface SkillInfo {
  name: string;
  description: string;
  category: string;
}

const SKILL_CATEGORIES: Record<string, string> = {
  // Coding & Dev
  'coding-agent':    'Coding & Dev',
  'github':          'Coding & Dev',
  'gh-issues':       'Coding & Dev',
  'shell':           'Coding & Dev',
  'skill-creator':   'Coding & Dev',
  'filesystem':      'Coding & Dev',
  // AI & Memory
  'mempalace':             'AI & Memory',
  'taskflow':              'AI & Memory',
  'taskflow-inbox-triage': 'AI & Memory',
  'session-logs':          'AI & Memory',
  'model-usage':           'AI & Memory',
  'summarize':             'AI & Memory',
  'acp-router':            'AI & Memory',
  // Productivity
  'gog':       'Productivity',
  'notion':    'Productivity',
  'obsidian':  'Productivity',
  'trello':    'Productivity',
  '1password': 'Productivity',
  'himalaya':  'Productivity',
  'clawhub':   'Productivity',
  'oracle':    'Productivity',
  'ordercli':  'Productivity',
  // Communication
  'discord':    'Communication',
  'slack':      'Communication',
  'wacli':      'Communication',
  'voice-call': 'Communication',
  // Media & Creative
  'loosely-twisted-design-engine': 'Media & Creative',
  'openai-whisper':     'Media & Creative',
  'openai-whisper-api': 'Media & Creative',
  'video-frames':       'Media & Creative',
  'gifgrep':            'Media & Creative',
  'songsee':            'Media & Creative',
  'spotify-player':     'Media & Creative',
  'canvas':             'Media & Creative',
  'nano-pdf':           'Media & Creative',
  // Smart Home
  'openhue':  'Smart Home',
  'sonoscli': 'Smart Home',
  // Utilities
  'weather':       'Utilities',
  'healthcheck':   'Utilities',
  'node-connect':  'Utilities',
  'xurl':          'Utilities',
  'blogwatcher':   'Utilities',
  'gemini':        'Utilities',
  'blucli':        'Utilities',
  'eightctl':      'Utilities',
  'goplaces':      'Utilities',
  'mcporter':      'Utilities',
  'sag':           'Utilities',
};

function extractFromFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter = match[1];

  const nameMatch = frontmatter.match(/^name:\s*['"]?(.+?)['"]?\s*$/m);

  // description may be single-line or a block — grab the value on the same line
  const descMatch = frontmatter.match(/^description:\s*['"]?([\s\S]+?)['"]?\s*(?:\nmetadata|\n\w|$)/m);

  return {
    name: nameMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim().replace(/\\n/g, ' '),
  };
}

function extractFromHeading(content: string): { description?: string } {
  const lines = content.split('\n');
  let foundHeading = false;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const desc = line.replace(/^#\s+/, '').trim();
      if (desc) return { description: desc };
      foundHeading = true;
      continue;
    }
    if (foundHeading && line.trim()) {
      return { description: line.trim() };
    }
  }
  return {};
}

async function readSkillsFromDir(dir: string): Promise<SkillInfo[]> {
  const skills: SkillInfo[] = [];
  try {
    if (!fs.existsSync(dir)) return skills;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    const skillPromises = entries
      .filter(entry => entry.isDirectory())
      .map(async (entry) => {
        const skillMdPath = path.join(dir, entry.name, 'SKILL.md');
        try {
          if (!fs.existsSync(skillMdPath)) return null;
          const content = await fs.promises.readFile(skillMdPath, 'utf8');

          // Try frontmatter first (most SKILL.md files have it)
          const fm = extractFromFrontmatter(content);
          const skillName = fm.name ?? entry.name;
          if (fm.description) {
            return {
              name: skillName,
              description: fm.description,
              category: SKILL_CATEGORIES[skillName] ?? SKILL_CATEGORIES[entry.name] ?? 'Other',
            };
          }

          // Fall back to markdown heading extraction
          const heading = extractFromHeading(content);
          return {
            name: entry.name,
            description: heading.description ?? '',
            category: SKILL_CATEGORIES[entry.name] ?? 'Other',
          };
        } catch {
          return null;
        }
      });

    const results = await Promise.all(skillPromises);
    return results.filter((s): s is SkillInfo => s !== null);
  } catch {
    return skills;
  }
}

// Skills that require macOS/Linux-only apps or tools — not usable on Windows
const WINDOWS_INCOMPATIBLE = new Set([
  'apple-notes',
  'apple-reminders',
  'bear-notes',
  'bluebubbles',
  'camsnap',
  'imsg',
  'peekaboo',
  'things-mac',
  'tmux',
]);

export async function GET() {
  const builtInDir = 'C:/Users/tberg/AppData/Roaming/npm/node_modules/openclaw/skills';
  const customDir = 'C:/Users/tberg/.openclaw/workspace/skills';

  const [builtIn, custom] = await Promise.all([
    readSkillsFromDir(builtInDir),
    readSkillsFromDir(customDir)
  ]);

  // Merge; custom skills override built-in if same name
  const skillMap = new Map<string, SkillInfo>();
  for (const skill of builtIn) skillMap.set(skill.name, skill);
  for (const skill of custom) skillMap.set(skill.name, skill);

  const skills = Array.from(skillMap.values())
    .filter((s) => !WINDOWS_INCOMPATIBLE.has(s.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(skills);
}
