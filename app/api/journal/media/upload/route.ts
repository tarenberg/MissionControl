import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

// TODO: Consider if non-image/video files should be rejected at upload time

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'media', 'journal');

async function ensureUploadDir() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
    throw new Error('Failed to prepare upload directory.');
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureUploadDir();

    // Use req.formData() for Next.js App Router compatibility
    const formData = await req.formData();
    
    const uploadedMedia = [];

    // Iterate over all entries in the FormData
    for (const [name, value] of formData.entries()) {
      if (value instanceof File) {
        const file: File = value;

        // Basic validation
        if (file.size === 0) {
            console.warn(`Skipping empty file: ${file.name}`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            throw new Error('File size exceeds 10MB limit.');
        }

        // Generate a unique filename
        const originalFilename = file.name || 'upload';
        const fileExtension = path.extname(originalFilename);
        const baseFilename = path.basename(originalFilename, fileExtension);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFilename = `${baseFilename}-${uniqueSuffix}${fileExtension}`;
        const filePath = path.join(uploadDir, newFilename);

        // Save the file to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        // Prepare response metadata
        const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath);
        // Use string.replaceAll to replace backslashes with forward slashes for URLs
        const fileUrl = `/${relativePath.replaceAll('\\', '/')}`; 
        const mimeType = mime.lookup(newFilename) || 'application/octet-stream';
        // Extract base type ("image" from "image/jpeg", "video" from "video/mp4", etc.)
        const fileType = mimeType.split('/')[0];
        
        // Placeholder caption, editable in UI
        const caption = formData.get(`caption-${name}`)?.toString() || null; // If captions are sent alongside files

        uploadedMedia.push({
          url: fileUrl,
          type: fileType, // "image", "video", "audio", etc.
          filename: newFilename,
          caption: caption,
          size: file.size,
        });
      }
    }

    if (uploadedMedia.length === 0) {
        return NextResponse.json({ success: false, error: 'No files uploaded or recognized.' }, { status: 400 });
    }

    console.log(`[upload] Processed ${uploadedMedia.length} file(s):`, uploadedMedia.map(m => ({ url: m.url, type: m.type })));
    return NextResponse.json({ success: true, uploadedMedia });
  } catch (error: any) {
    console.error('[upload] Error uploading media:', error);
    if (error.message.includes('exceeds the 10MB')) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 413 });
    }
    return NextResponse.json({ error: error.message || 'Failed to upload media.' }, { status: 500 });
  }
}
