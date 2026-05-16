import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security check: Only allow access to specific directories
  const allowedDirectories = [
    path.join(process.cwd(), 'media', 'celebrations'),
    path.join(process.cwd(), 'data')
  ];

  const absolutePath = path.resolve(filePath);
  const isAllowed = allowedDirectories.some(dir => absolutePath.startsWith(dir));

  if (!isAllowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/right',
    '.json': 'application/json'
  };

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    },
  });
}
