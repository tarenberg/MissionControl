import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const safeName = `${crypto.randomUUID()}.${extension}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    await mkdir(uploadDir, { recursive: true });
    const absPath = join(uploadDir, safeName);
    await writeFile(absPath, bytes);

    const isLikelyText =
      file.type.startsWith('text/') ||
      file.type.includes('json') ||
      file.type.includes('xml') ||
      file.type.includes('javascript') ||
      file.type.includes('typescript');

    let textPreview: string | null = null;
    if (isLikelyText && bytes.length <= 1_500_000) {
      try {
        textPreview = new TextDecoder('utf-8', { fatal: false }).decode(bytes).slice(0, 4000);
      } catch {
        textPreview = null;
      }
    }

    return NextResponse.json({
      ok: true,
      file: {
        url: `/uploads/chat/${safeName}`,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        textPreview,
      },
    });
  } catch (error: any) {
    console.error('Chat Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed.' }, { status: 500 });
  }
}
