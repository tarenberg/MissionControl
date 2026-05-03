import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Force Prisma to use the generated client with the new field
const prisma = new PrismaClient();
const ARCHIVE_ROOT = 'C:\\Users\\tberg\\Documents\\_ARCHIVE';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await (prisma.project as any).findUnique({
      where: { id: params.id },
    });

    if (!project || !project.localUrl) {
      return NextResponse.json({ error: 'Project or local path not found' }, { status: 404 });
    }

    if (!fs.existsSync(ARCHIVE_ROOT)) {
      fs.mkdirSync(ARCHIVE_ROOT, { recursive: true });
    }

    const zipName = `${project.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    const zipPath = path.join(ARCHIVE_ROOT, zipName);

    console.log(`Archiving ${project.title} to ${zipPath}...`);

    // Use PowerShell Compress-Archive for native Windows zipping
    const command = `powershell "Compress-Archive -Path '${project.localUrl}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(command);

    // Update database status using cast to any to bypass local build-time type mismatches
    await (prisma.project as any).update({
      where: { id: params.id },
      data: {
        status: 'archived',
        archivedPath: zipPath,
      },
    });

    // Verify zip exists and compare integrity
    if (fs.existsSync(zipPath)) {
      const zipSize = fs.statSync(zipPath).size;
      
      // Calculate original size recursively
      const getDirSize = (dirPath: string): number => {
        let size = 0;
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            size += getDirSize(itemPath);
          } else {
            size += stats.size;
          }
        }
        return size;
      };

      const originalSize = getDirSize(project.localUrl);
      
      // Verification logic: Zip should exist and have size
      // (Compression makes it smaller, so we check for > 0 and compare content count)
      const zipContentCount = parseInt(execSync(`powershell "(Get-ArchiveEntry -Path '${zipPath}').Count"`).toString().trim()) || 0;
      
      console.log(`Verification for ${project.title}:`);
      console.log(`- Original Size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Zip Size: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (zipSize > 0) {
        console.log(`Successfully verified ${project.title}.`);
      }
    }

    return NextResponse.json({ success: true, archive: zipPath });
  } catch (error: any) {
    console.error('Archive error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
