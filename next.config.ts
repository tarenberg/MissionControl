import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.53', 
    '100.109.216.115', 
    '192.168.1.66', 
    '100.122.131.19',
    'localhost:3001',
    'localhost:3002',
    'twisted',
    'twisted.tail39532b.ts.net',
    '10.0.0.1'
  ],
  async rewrites() {
    return [
      {
        source: '/tools/ArtTrackerDashboard/:path*',
        destination: 'http://localhost:8080/tools/ArtTrackerDashboard/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' blob: https://*.google.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:8080 http://100.109.216.115:8080 http://twisted:8080 http://twisted.tail39532b.ts.net:8080; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com wss://*.googleapis.com http://localhost:3000 http://localhost:3001 http://localhost:8080 http://100.109.216.115:3000 http://100.109.216.115:3001 http://100.109.216.115:8080 http://twisted:8080 http://twisted.tail39532b.ts.net:8080; frame-src 'self' https://*.google.com; media-src 'self' data: blob: http://localhost:3000 http://100.109.216.115:3000 http://localhost:8080 http://100.109.216.115:8080 http://twisted:8080 http://twisted.tail39532b.ts.net:8080; worker-src 'self' blob:; child-src 'self' blob:;",
          },
        ],
      },
      {
        source: '/__nextjs_font/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/_next/static/media/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
 
 
 
