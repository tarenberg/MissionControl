import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }

    const uploadedMedia = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Generate safe file name
      const fileExtension = file.name.split('.').pop() || 'bin';
      const uniqueName = `${crypto.randomUUID()}.${fileExtension}`;
      
      // Save to public uploads
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'journal');
      const filePath = join(uploadDir, uniqueName);
      
      await writeFile(filePath, buffer);
      
      const fileUrl = `/uploads/journal/${uniqueName}`;
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      
      uploadedMedia.push({
        url: fileUrl,
        type,
        filename: file.name
      });
    }

    return NextResponse.json({ success: true, media: uploadedMedia });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed.' }, { status: 500 });
  }
}
