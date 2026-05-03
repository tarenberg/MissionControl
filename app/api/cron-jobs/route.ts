import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cronFilePath = path.join('C:\\Users\\tberg\\.openclaw\\cron', 'jobs.json');
    const fileContent = readFileSync(cronFilePath, 'utf-8');
    const cronData = JSON.parse(fileContent);
    
    return NextResponse.json(cronData.jobs);
  } catch (error) {
    console.error('[GET /api/cron-jobs]', error);
    return NextResponse.json(
      { error: 'Failed to fetch cron jobs' },
      { status: 500 }
    );
  }
}
