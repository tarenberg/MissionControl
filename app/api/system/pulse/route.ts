import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import http from 'http';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, { timeout: 1000 }, (res) => {
      // Any response (even 404) means the port is listening
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

export async function GET() {
  const pulse: any = {
    timestamp: new Date().toISOString(),
    services: {
      gateway: {
        name: 'OpenClaw Gateway',
        port: 18789,
        status: 'offline',
      },
      missionControl: {
        name: 'Mission Control Server',
        port: 3001,
        status: 'online', // If we are here, this is online
      },
      artTracker: {
        name: 'Art Tracker Standalone',
        port: 8080,
        status: 'offline',
      }
    },
    agents: [
      { id: 'jason', name: 'Jason', status: 'online' },
      { id: 'pixels', name: 'Pixels', status: 'online' },
      { id: 'scout', name: 'Scout', status: 'online' }
    ],
    nest: {
      status: 'disconnected',
    }
  };

  try {
    // Parallel port checks
    const [gatewayOnline, artTrackerOnline] = await Promise.all([
      checkPort(18789),
      checkPort(8080)
    ]);
    
    pulse.services.gateway.status = gatewayOnline ? 'online' : 'offline';
    pulse.services.artTracker.status = artTrackerOnline ? 'online' : 'offline';

    // Fast process check instead of powershell
    try {
      const { stdout } = await execAsync('tasklist /fi "imagename eq node.exe" /fo csv /nh', { timeout: 1000 });
      if (stdout && stdout.toLowerCase().includes('node.exe')) {
        // This is generic, but checkPort(18789) is our primary source of truth for the Gateway.
        // We only use this to confirm some node processes are running.
      }
    } catch (e) {}

    // Check Nest environment variables - temporary simple check for UI
    if (process.env.NEST_REFRESH_TOKEN && process.env.NEST_REFRESH_TOKEN.length > 20 && !process.env.NEST_AUTH_FAILED) {
      pulse.nest.status = 'connected';
      // In a real scenario we'd fetch actual data, but for this sprint we are mocking state 
      // or using a secondary light check.
      pulse.nest.temp = 68; 
      pulse.nest.humidity = 42;
    }

  } catch (error) {
    console.error('[GET /api/system/pulse] Error:', error);
  }

  return NextResponse.json(pulse);
}
