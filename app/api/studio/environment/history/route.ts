import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const logs = await prisma.climateLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 24, // Last 24 logs
    });

    return NextResponse.json({ logs: logs.reverse() });
  } catch (error: any) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
