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
  async headers() {
    return [
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
