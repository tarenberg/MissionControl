import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_HOSTS = [
  'localhost:3001',
  '127.0.0.1:3001',
  '192.168.1.53:3001',
  '192.168.1.66:3001',
  '100.109.216.115:3001',
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow API routes from all known hosts
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
