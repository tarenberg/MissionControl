import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const openClawModels = [
      'google/gemini-flash-latest',
      'google/gemini-2.0-flash',
      'anthropic/claude-3-5-sonnet-latest',
      'openai/gpt-4o'
    ];

    let ollamaModels: string[] = [];
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        ollamaModels = data.models.map((m: any) => m.name);
      } else {
        ollamaModels = ['Ollama: error response'];
      }
    } catch (e) {
      ollamaModels = ['Ollama: unreachable'];
    }

    return NextResponse.json({
      openClawModels,
      ollamaModels,
      note: 'Live fetch from Ollama (timeout: 2s)'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
