"use server";

import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { Project } from '../../interfaces/Project';
import type { Project as PrismaProject } from '@prisma/client';

const DOCS_ROOT_DIR = path.join('C:\\Users\\tberg\\.openclaw\\workspace', 'docs');
const DOCS_PROJECTS_DIR = path.join(DOCS_ROOT_DIR, 'projects');

// ── Helpers ─────────────────────────────────────────────────────────────────

const ensureDirectory = (dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

const ensureProjectDocsFolder = (projectId: string) => {
  ensureDirectory(DOCS_PROJECTS_DIR);
  const projectDir = path.join(DOCS_PROJECTS_DIR, projectId);
  ensureDirectory(projectDir);
};

/** Extra fields we serialize into the `githubRepo` column as JSON metadata. */
interface ExtraMeta {
  importance: Project['importance'];
  progress: number;
  groups: string[];
  sourcePath: string;
  launchUrl?: string | null;
  lastWorkedOn: string;
  lastAgent: string;
}

function serializeMeta(p: Partial<Project>): string {
  const meta: ExtraMeta = {
    importance: (p.importance as Project['importance']) ?? 'Medium',
    progress: p.progress ?? 0,
    groups: p.groups ?? [],
    sourcePath: p.sourcePath ?? '',
    launchUrl: p.launchUrl ?? null,
    lastWorkedOn: p.lastWorkedOn ?? new Date().toISOString(),
    lastAgent: p.lastAgent ?? 'Unassigned',
  };
  return JSON.stringify(meta);
}

function parseMeta(githubRepo: string | null): ExtraMeta {
  const defaults: ExtraMeta = {
    importance: 'Medium',
    progress: 0,
    groups: [],
    sourcePath: '',
    launchUrl: null,
    lastWorkedOn: new Date().toISOString(),
    lastAgent: 'Unassigned',
  };
  if (!githubRepo) return defaults;
  try {
    return { ...defaults, ...JSON.parse(githubRepo) };
  } catch {
    return defaults;
  }
}

function mapToProject(p: PrismaProject): Project {
  const meta = parseMeta(p.githubRepo);
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? '',
    status: (p.status as Project['status']) ?? 'Planning',
    importance: meta.importance,
    progress: meta.progress,
    groups: meta.groups,
    sourcePath: meta.sourcePath,
    launchUrl: meta.launchUrl ?? undefined,
    repoUrl: p.githubUrl ?? undefined,
    lastWorkedOn: meta.lastWorkedOn,
    lastAgent: meta.lastAgent,
    createdAt: p.createdAt.toISOString(),
  };
}

// ── Server Actions ───────────────────────────────────────────────────────────

export async function getProjectsServer(): Promise<Project[]> {
  try {
    const rows = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
    const projects = rows.map(mapToProject);
    projects.forEach(p => ensureProjectDocsFolder(p.id));
    return projects;
  } catch (error) {
    console.error('Error fetching projects from DB:', error);
    return [];
  }
}

export async function addProjectServer(
  newProjectData: Omit<Project, 'id' | 'createdAt'>
): Promise<Project> {
  const row = await prisma.project.create({
    data: {
      title: newProjectData.title,
      description: newProjectData.description ?? null,
      status: newProjectData.status ?? 'Planning',
      githubUrl: newProjectData.repoUrl ?? null,
      githubRepo: serializeMeta(newProjectData),
    },
  });
  const project = mapToProject(row);
  ensureProjectDocsFolder(project.id);
  return project;
}

export async function updateProjectServer(
  updatedProjectData: Project
): Promise<Project | null> {
  try {
    const row = await prisma.project.update({
      where: { id: updatedProjectData.id },
      data: {
        title: updatedProjectData.title,
        description: updatedProjectData.description ?? null,
        status: updatedProjectData.status,
        githubUrl: updatedProjectData.repoUrl ?? null,
        githubRepo: serializeMeta({
          ...updatedProjectData,
          lastWorkedOn: new Date().toISOString(),
        }),
      },
    });
    ensureProjectDocsFolder(row.id);
    return mapToProject(row);
  } catch (error) {
    console.error('Error updating project:', error);
    return null;
  }
}

export async function deleteProjectServer(id: string): Promise<boolean> {
  try {
    await prisma.project.delete({ where: { id } });
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

export async function archiveProjectServer(id: string): Promise<Project | null> {
  try {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return null;

    const meta = parseMeta(existing.githubRepo);
    meta.lastWorkedOn = new Date().toISOString();

    const row = await prisma.project.update({
      where: { id },
      data: {
        status: 'Archived',
        githubRepo: JSON.stringify(meta),
      },
    });
    ensureProjectDocsFolder(id);
    return mapToProject(row);
  } catch (error) {
    console.error('Error archiving project:', error);
    return null;
  }
}

// Keep saveProjectsServer as a no-op for backward compatibility
// (Previously wrote to JSON; now handled by individual mutations above)
export async function saveProjectsServer(_projects: Project[]): Promise<void> {
  // No-op: persistence is now via Prisma
}
