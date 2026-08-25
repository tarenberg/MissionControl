import { NextRequest, NextResponse } from 'next/server';

// Point to NestJS backend (port 3001) instead of external Journey Sync container
const JOURNEY_SYNC_URL = process.env.JOURNEY_SYNC_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Fetch from NestJS backend
    const response = await fetch(`${JOURNEY_SYNC_URL}/api/entries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`NestJS backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      entries: Array.isArray(data) ? data : data.entries || [],
      total: (Array.isArray(data) ? data.length : data.total) || 0,
    });
  } catch (error) {
    console.error('NestJS backend fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch from backend',
        entries: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward to NestJS backend
    const response = await fetch(`${JOURNEY_SYNC_URL}/api/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`NestJS backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('NestJS backend create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create entry',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    // Forward to NestJS backend
    const response = await fetch(`${JOURNEY_SYNC_URL}/api/entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`NestJS backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('NestJS backend update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update entry',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    // Forward to NestJS backend
    const response = await fetch(`${JOURNEY_SYNC_URL}/api/entries/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`NestJS backend error: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('NestJS backend delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete entry',
      },
      { status: 500 }
    );
  }
}
