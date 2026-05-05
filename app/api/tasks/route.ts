import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: { project: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, status, assignedTo, projectId } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        status: status ?? 'Backlog',
        assignedTo: assignedTo ?? null,
        projectId: projectId && projectId !== '' ? projectId : null,
      },
      include: { project: true },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
