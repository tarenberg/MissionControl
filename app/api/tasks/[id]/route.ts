import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, status, assignedTo, projectId } = body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(projectId !== undefined && { projectId }),
      },
      include: { project: true },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('[PATCH /api/tasks/[id]]', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
