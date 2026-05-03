import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.53', 
    '100.109.216.115', 
    '192.168.1.66', 
    '100.122.131.19',
    'twisted',
    'twisted.tail39532b.ts.net'
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
    ];
  },
};

export default nextConfig;
