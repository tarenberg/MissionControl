import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Command to find node processes listening on ports 3001-3010
    // We use powershell to get the port and the process ID
    const command = `powershell -Command "Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 3001 -and $_.LocalPort -le 3020 } | Select-Object LocalPort, OwningProcess | ConvertTo-Json"`;
    
    const { stdout } = await execAsync(command);
    
    if (!stdout || stdout.trim() === "") {
      return NextResponse.json({ activePorts: [] });
    }

    let results = JSON.parse(stdout);
    
    // Handle single object vs array from PowerShell
    if (!Array.isArray(results)) {
      results = [results];
    }

    const activePorts = results.map((r: any) => ({
      port: r.LocalPort,
      pid: r.OwningProcess
    }));

    return NextResponse.json({ activePorts });
  } catch (error) {
    console.error('[GET /api/system-status/ports]', error);
    return NextResponse.json({ activePorts: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const port = searchParams.get('port');

    if (!port) {
      return NextResponse.json({ error: 'Port required' }, { status: 400 });
    }

    // Find the process on that port and kill it
    const killCommand = `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { taskkill /PID $_.OwningProcess /F /T }"`;
    
    await execAsync(killCommand);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/system-status/ports]', error);
    return NextResponse.json({ error: 'Failed to kill process' }, { status: 500 });
  }
}
