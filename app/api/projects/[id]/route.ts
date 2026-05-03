import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, status, githubRepo, githubUrl, localUrl, devUrl } = body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(githubRepo !== undefined && { githubRepo }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(localUrl !== undefined && { localUrl }),
        ...(devUrl !== undefined && { devUrl }),
      },
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('[PATCH /api/projects/[id]]', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/projects/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
