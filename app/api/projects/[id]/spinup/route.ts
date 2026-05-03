import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project || !project.localUrl) {
      return NextResponse.json({ error: 'Project or local path not found' }, { status: 404 });
    }

    // Check for a free port starting at 3001
    const getFreePort = async (startPort: number): Promise<number> => {
      return new Promise((resolve) => {
        const checkPort = (port: number) => {
          const server = require('net').createServer();
          server.once('error', () => checkPort(port + 1));
          server.once('listening', () => {
            server.close();
            resolve(port);
          });
          server.listen(port);
        };
        checkPort(startPort);
      });
    };

    let port = await getFreePort(3001);
    
    // Detect project type and set flags
    let command = '';
    let protocol = 'http';
    
    try {
      const pkgPath = path.join(project.localUrl, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const isNext = pkg.dependencies?.next || pkg.devDependencies?.next;
      const isVite = pkg.dependencies?.vite || pkg.devDependencies?.vite;

      if (pkg.dependencies?.['@vitejs/plugin-basic-ssl'] || pkg.devDependencies?.['@vitejs/plugin-basic-ssl']) {
        protocol = 'https';
      }

      if (isNext) {
        command = `start cmd.exe /K "cd /d ${project.localUrl} && npm run dev -- -p ${port} -H 0.0.0.0"`;
      } else if (isVite) {
        command = `start cmd.exe /K "cd /d ${project.localUrl} && npx vite --port ${port} --host 0.0.0.0 --force"`;
      } else if (pkg.scripts?.dev?.includes('python -m http.server')) {
        // For python servers, we spin up the server AND a secure proxy
        const proxyPort = port + 10; // Use a distinct offset for the secure proxy
        const proxyPath = 'C:\\Users\\tberg\\AppData\\Roaming\\npm\\local-ssl-proxy.cmd';
        command = `start cmd.exe /K "cd /d ${project.localUrl} && (start /b python -m http.server ${port} --bind 127.0.0.1) && ${proxyPath} --source ${proxyPort} --target ${port} --hostname 0.0.0.0"`;
        port = proxyPort; // Update port to the secure one for the UI
        protocol = 'https';
      } else {
        command = `start cmd.exe /K "cd /d ${project.localUrl} && npm run dev"`;
      }
    } catch (e) {
      console.warn('[SpinUp] Failed to detect project type, using fallback command');
      command = `start cmd.exe /K "cd /d ${project.localUrl} && npm run dev"`;
    }

    console.log(`[SpinUp] Running command: ${command}`);

    // Update the project's devUrl in the database so the UI reflects the current port
    const updatedDevUrl = `${protocol}://100.109.216.115:${port}`;
    
    // Clear this port from any other project's devUrl to prevent false positives
    await prisma.project.updateMany({
      where: {
        devUrl: {
          contains: `:${port}`
        },
        NOT: { id }
      },
      data: { devUrl: null }
    });

    await prisma.project.update({
      where: { id },
      data: { devUrl: updatedDevUrl }
    });

    exec(command, (error) => {
      if (error) {
        console.error(`[SpinUp Error]: ${error.message}`);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Spinning up ${project.title} on port ${port}...`,
      port,
      protocol
    });
  } catch (error) {
    console.error('[POST /api/projects/[id]/spinup]', error);
    return NextResponse.json({ error: 'Failed to spin up project' }, { status: 500 });
  }
}
