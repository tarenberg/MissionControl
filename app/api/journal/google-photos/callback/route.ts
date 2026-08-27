import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/journal/google-photos/callback
 * OAuth callback from Google Photos authentication
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `/journey-sync?error=Google Photos authentication failed: ${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect('/journey-sync?error=No authorization code received');
    }

    // Exchange code for token
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/journal/google-photos/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange error:', error);
      return NextResponse.redirect('/journey-sync?error=Failed to exchange authorization code');
    }

    const { access_token, refresh_token } = await tokenResponse.json();

    // Store tokens (in production: use secure session/database)
    // For now, redirect back with token in query (INSECURE - for demo only)
    // In production, store in secure httpOnly cookie or session

    return NextResponse.redirect(
      `/journey-sync?google_photos_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      `/journey-sync?error=${encodeURIComponent(error instanceof Error ? error.message : 'Authentication failed')}`
    );
  }
}
