/**
 * GitHub Manual Sync API
 * Triggers manual synchronization of GitHub issues and PRs
 */

import { NextRequest, NextResponse } from 'next/server';
import { githubSyncService } from '@/lib/github/sync-service';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Trigger sync
    const result = await githubSyncService.syncProject(projectId);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get sync history
    const history = await githubSyncService.getSyncHistory(projectId);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Sync history error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
