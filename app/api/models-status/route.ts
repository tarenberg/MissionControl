import { NextResponse } from 'next/server';

// Safe mock data — do NOT execute shell commands that could hang the gateway
export async function GET() {
  try {
    // Return safe mock data instead of executing shell commands
    // Shell exec can hang indefinitely and crash the gateway
    const openClawModels = [
      'Default: google/gemini-2.5-pro',
      'Fallbacks: anthropic/claude-haiku-4-5',
      'Status: OK'
    ];

    const ollamaModels = [
      'Ollama: offline or not running (safe mode)'
    ];

    return NextResponse.json({
      openClawModels,
      ollamaModels,
      note: 'Running in safe mode (no shell exec to prevent gateway hangs)'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
