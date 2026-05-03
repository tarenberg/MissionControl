import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('[GET /api/projects]', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, status, githubRepo, githubUrl, localUrl, devUrl } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description: description ?? null,
        status: status ?? 'active',
        githubRepo: githubRepo ?? null,
        githubUrl: githubUrl ?? null,
        localUrl: localUrl ?? null,
        devUrl: devUrl ?? null,
      },
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('[POST /api/projects]', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
