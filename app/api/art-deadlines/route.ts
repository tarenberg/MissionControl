import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.resolve(process.cwd(), 'data', 'art-deadlines.json');
    const dismissPath = path.resolve(process.cwd(), 'data', 'dismissed-deadlines.json');
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json([]);
    }
    
    const deadlines = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let dismissed: string[] = [];
    
    if (fs.existsSync(dismissPath)) {
      dismissed = JSON.parse(fs.readFileSync(dismissPath, 'utf8'));
    }
    
    const filtered = deadlines.filter((d: any) => !dismissed.includes(d.link));
    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { link } = await request.json();
    const dismissPath = path.resolve(process.cwd(), 'data', 'dismissed-deadlines.json');
    
    let dismissed: string[] = [];
    if (fs.existsSync(dismissPath)) {
      dismissed = JSON.parse(fs.readFileSync(dismissPath, 'utf8'));
    }
    
    if (!dismissed.includes(link)) {
      dismissed.push(link);
      fs.writeFileSync(dismissPath, JSON.stringify(dismissed, null, 2));
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
