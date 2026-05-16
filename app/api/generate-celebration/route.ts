import { NextResponse } from 'next/server';
import { generateAcceptancePost } from '../../../scripts/generate-acceptance-post';

export async function POST(req: Request) {
  try {
    const { artworkTitle, imageUrl, showTitle } = await req.json();
    
    if (!artworkTitle || !imageUrl || !showTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await generateAcceptancePost(artworkTitle, imageUrl, showTitle);
    
    return NextResponse.json({
        message: 'Celebration post generated successfully!',
        ...result
    });
  } catch (error: any) {
    console.error('Celebration generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
