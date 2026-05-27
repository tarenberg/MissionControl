import { NextResponse } from 'next/server';
import net from 'net';
import { spawn } from 'child_process';

function checkPort(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000;
    
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

export async function GET() {
  try {
    const [nextDevOnline, localAiOnline, gatewayOnline] = await Promise.all([
      checkPort(3000),
      checkPort(8000),
      checkPort(9000)
    ]);

    return NextResponse.json({
      services: [
        {
          id: 'next_dev',
          name: 'Next.js Dev Server',
          port: 3000,
          status: nextDevOnline ? 'online' : 'offline',
          description: 'Frontend and API compilation server'
        },
        {
          id: 'local_ai',
          name: 'Local Whisper/LLM Server',
          port: 8000,
          status: localAiOnline ? 'online' : 'offline',
          description: 'FastAPI server running Whisper STT'
        },
        {
          id: 'openclaw_gateway',
          name: 'OpenClaw Gateway',
          port: 9000,
          status: gatewayOnline ? 'online' : 'offline',
          description: 'Direct agent-routing and terminal orchestration daemon'
        }
      ]
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('[system-services] GET failed:', error);
    return NextResponse.json({ error: 'Failed to retrieve service status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, service } = body;

    if (action !== 'restart') {
      return NextResponse.json({ error: 'Invalid action. Only "restart" is supported.' }, { status: 400 });
    }

    if (service === 'local_ai') {
      console.log('[system-services] Triggering background restart of Local AI Server...');
      
      // PowerShell script to find PID on port 8000, kill it, and launch local_ai_server.py
      const psCommand = `
        $p = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess;
        if ($p) { Stop-Process -Id $p -Force };
        Start-Process python -ArgumentList "local_ai_server.py" -WorkingDirectory "C:\\Users\\tberg\\Documents\\_PROJECTS\\AI-Engines" -WindowStyle Hidden
      `.replace(/\n/g, ' ').trim();

      const child = spawn('powershell', ['-Command', psCommand], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      return NextResponse.json({ success: true, message: 'Local AI restart sequence initiated.' });
    }

    if (service === 'next_dev') {
      console.log('[system-services] Triggering background self-restart of Next.js Dev Server...');

      // Delayed PowerShell command to sleep 1.5s, let response return, kill port 3000, and restart dev server
      const psCommand = `
        Start-Sleep -m 1500;
        $p = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess;
        if ($p) { Stop-Process -Id $p -Force };
        Start-Process npx -ArgumentList "next dev --hostname 0.0.0.0 --webpack" -WorkingDirectory "C:\\Users\\tberg\\Documents\\_PROJECTS\\MissionControl" -WindowStyle Hidden
      `.replace(/\n/g, ' ').trim();

      const child = spawn('powershell', ['-Command', psCommand], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      return NextResponse.json({ success: true, message: 'Next.js compilation server self-restart sequence scheduled.' });
    }

    if (service === 'openclaw_gateway') {
      console.log('[system-services] Triggering background restart of OpenClaw Gateway...');

      // Run 'openclaw gateway restart' to restart the daemon cleanly
      const psCommand = `
        Start-Process openclaw -ArgumentList "gateway restart" -WindowStyle Hidden
      `.replace(/\n/g, ' ').trim();

      const child = spawn('powershell', ['-Command', psCommand], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      return NextResponse.json({ success: true, message: 'OpenClaw Gateway restart sequence initiated.' });
    }

    return NextResponse.json({ error: 'Invalid service specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('[system-services] POST failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
