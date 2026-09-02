import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore: Adding allowedDevOrigins to fix HMR cross-origin block on local network
  allowedDevOrigins: ['192.168.0.103', 'localhost', '127.0.0.1', '192.168.0.103:3000', '192.168.0.105:3000', '192.168.0.105'],
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'trtpfusjnjpewugwlqnb.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    // Only apply security headers in production
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data:",
                "connect-src 'self' https://*.supabase.co https://*.googleapis.com wss://*.supabase.co",
                "frame-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "upgrade-insecure-requests",
              ].join('; ')
            },
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload'
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block'
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()'
            },
          ],
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
