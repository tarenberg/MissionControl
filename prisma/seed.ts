import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface RawTask {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  status?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface RawProject {
  id: string;
  title: string;
  description?: string;
  status?: string;
  repoUrl?: string;
  githubUrl?: string;
  importance?: string;
  progress?: number;
  groups?: string[];
  sourcePath?: string;
  launchUrl?: string;
  lastWorkedOn?: string;
  lastAgent?: string;
  createdAt?: string;
  [key: string]: unknown;
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data');

  // ── Seed Projects ───────────────────────────────────────────────────────────
  const projectsRaw: RawProject[] = JSON.parse(
    readFileSync(path.join(dataDir, 'projects.json'), 'utf-8')
  );

  console.log(`Seeding ${projectsRaw.length} projects…`);
  for (const p of projectsRaw) {
    // Store extra fields that aren't in the schema into githubRepo as JSON metadata
    const extraMeta = JSON.stringify({
      importance: p.importance ?? 'Medium',
      progress: p.progress ?? 0,
      groups: p.groups ?? [],
      sourcePath: p.sourcePath ?? '',
      launchUrl: p.launchUrl ?? null,
      lastWorkedOn: p.lastWorkedOn ?? new Date().toISOString(),
      lastAgent: p.lastAgent ?? 'Unassigned',
    });

    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        status: p.status ?? 'active',
        githubUrl: p.repoUrl ?? p.githubUrl ?? null,
        githubRepo: extraMeta,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      },
    });
  }
  console.log('✔ Projects seeded');

  // ── Seed Tasks ──────────────────────────────────────────────────────────────
  const tasksRaw: RawTask[] = JSON.parse(
    readFileSync(path.join(dataDir, 'tasks.json'), 'utf-8')
  );

  console.log(`Seeding ${tasksRaw.length} tasks…`);
  for (const t of tasksRaw) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: t.description ?? null,
        assignedTo: null, // legacy short codes (M/T) aren't Contact IDs — reassign manually
        status: t.status ?? 'Backlog',
      },
    });
  }
  console.log('✔ Tasks seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
