import { NextRequest, NextResponse } from 'next/server';

const LOCAL_AI_URL = 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;

    if (!audioBlob) {
      return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
    }

    const sttFormData = new FormData();
    sttFormData.append('audio', audioBlob, 'preview.webm');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const sttRes = await fetch(`${LOCAL_AI_URL}/stt`, {
      method: 'POST',
      body: sttFormData,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout);
    });

    if (!sttRes.ok) {
      throw new Error(`Local STT failed: ${sttRes.statusText}`);
    }

    const { text } = await sttRes.json();
    return NextResponse.json({ text: (text || '').trim() });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Preview STT timeout' }, { status: 504 });
    }
    console.error('STT preview error:', err);
    return NextResponse.json({ error: err.message || 'Preview failed' }, { status: 500 });
  }
}
