
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'app';

  let logPath;
  if (type === 'gateway') {
    // Try local date first, then fallback to current log patterns
    const now = new Date();
    const localDate = now.toLocaleDateString('en-CA'); // yyyy-mm-dd
    logPath = `C:\\tmp\\openclaw\\openclaw-${localDate}.log`;
    
    if (!fs.existsSync(logPath)) {
      const utcDate = now.toISOString().slice(0, 10);
      logPath = `C:\\tmp\\openclaw\\openclaw-${utcDate}.log`;
    }
  } else {
    logPath = path.resolve(process.cwd(), 'debug_docs.log');
  }

  try {
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
    }

    const command = `powershell.exe -Command "Get-Content -Path '${logPath}' -Tail 50"`;
    const logs = execSync(command).toString().split('\n').filter(line => line.trim() !== '');
    return NextResponse.json(logs);
  } catch (error) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to read logs', details: errorMessage }, { status: 500 });
  }
}
