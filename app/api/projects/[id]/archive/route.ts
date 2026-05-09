import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const ARCHIVE_ROOT = 'C:\\Users\\tberg\\Documents\\_ARCHIVE';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await (prisma.project as any).findUnique({
      where: { id },
    });

    if (!project || !project.localUrl) {
      return NextResponse.json({ error: 'Project or local path not found' }, { status: 404 });
    }

    if (!fs.existsSync(ARCHIVE_ROOT)) {
      fs.mkdirSync(ARCHIVE_ROOT, { recursive: true });
    }

    const zipName = `${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    const zipPath = path.join(ARCHIVE_ROOT, zipName);

    console.log(`[Archive] Starting for ${project.title}...`);

    // Async archive process
    const excludeFolders = "('node_modules', '.git', '.next', 'dist', 'build')";
    const psScript = `
      $source = '${project.localUrl}';
      $dest = '${zipPath}';
      $files = Get-ChildItem -Path $source -Recurse | Where-Object { 
        $path = $_.FullName;
        $exclude = $false;
        ${excludeFolders}.ForEach({ if ($path -like "*\\$PSItem\\*") { $exclude = $true } });
        !$exclude 
      };
      if ($files) {
        Compress-Archive -Path $files.FullName -DestinationPath $dest -Force
      }
    `.replace(/\s+/g, ' ').trim();

    const command = `powershell -NoProfile -Command "${psScript}"`;

    // Start archiving in background
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`[Archive] Failed for ${project.title}:`, error);
        return;
      }
      
      console.log(`[Archive] Completed for ${project.title}. Updating database...`);
      
      try {
        await (prisma.project as any).update({
          where: { id },
          data: {
            status: 'archived',
            archivedPath: zipPath,
          },
        });
        console.log(`[Archive] Database updated for ${project.title}.`);
      } catch (dbErr) {
        console.error(`[Archive] DB update failed for ${project.title}:`, dbErr);
      }
    });

    // Return immediate response
    return NextResponse.json({ 
      success: true, 
      message: 'Archiving started in background',
      zipName
    });
  } catch (error: any) {
    console.error('Archive route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
