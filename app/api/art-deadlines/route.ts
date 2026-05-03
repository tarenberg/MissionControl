import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'art-deadlines.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const deadlines = JSON.parse(fileContent);
    return NextResponse.json(deadlines);
  } catch (error) {
    console.error('Error serving art deadlines:', error);
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
}
