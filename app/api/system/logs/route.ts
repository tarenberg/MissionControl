import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'app';

  let logPath;
  const now = new Date();
  const localDate = now.toLocaleDateString('en-CA'); // yyyy-mm-dd
  
  if (type === 'gateway' || type === 'app') {
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
      return NextResponse.json([]);
    }

    // Faster than spawning PowerShell: Read the last chunk of the file
    const stats = fs.statSync(logPath);
    const fileSize = stats.size;
    const chunkSize = 16384; // 16KB should be plenty for 50 lines
    const start = Math.max(0, fileSize - chunkSize);
    
    const buffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(logPath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, start);
    fs.closeSync(fd);
    
    const content = buffer.toString('utf8', 0, bytesRead);
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .slice(-50);

    return NextResponse.json(lines);
  } catch (error) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to read logs', details: errorMessage }, { status: 500 });
  }
}
