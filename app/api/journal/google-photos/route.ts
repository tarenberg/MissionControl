import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/journal/google-photos
 * Fetch photos from Google Photos library
 * Requires GOOGLE_PHOTOS_TOKEN in environment
 */
export async function GET(request: NextRequest) {
  try {
    const token = process.env.GOOGLE_PHOTOS_TOKEN;
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Photos not configured. Set GOOGLE_PHOTOS_TOKEN in environment.',
          config: false,
        },
        { status: 400 }
      );
    }

    // Fetch media items from Google Photos
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Photos API error:', error);
      throw new Error(`Google Photos API returned ${response.status}`);
    }

    const data = await response.json();

    // Map to usable format
    const photos = (data.mediaItems || []).map((item: any) => ({
      id: item.id,
      filename: item.filename,
      url: item.baseUrl,
      mimeType: item.mimeType,
      mediaMetadata: item.mediaMetadata,
      createdTime: item.mediaMetadata?.creationTime,
      photoInfo: item.mediaMetadata?.photo,
    }));

    return NextResponse.json({
      success: true,
      photos,
      total: photos.length,
    });
  } catch (error) {
    console.error('Google Photos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Google Photos',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/journal/google-photos/auth
 * Get OAuth redirect URL for Google Photos authentication
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/journal/google-photos/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/photoslibrary.readonly',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId || '');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      configured: !!clientId,
    });
  } catch (error) {
    console.error('Auth URL generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL',
      },
      { status: 500 }
    );
  }
}
