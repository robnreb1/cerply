// Resolve API base from env (Preview/Prod) with sensible localhost default.
const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';

// Strip trailing slashes so we never produce double slashes.
const API = RAW_API.replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  experimental: {
    serverActions: {
      // Add your Vercel project domain(s) here. For previews, add the preview hostname as needed.
      allowedOrigins: [
        'localhost:3000', 
        'cerply-web.vercel.app',
        'stg.cerply.com',
        // Note: *.vercel.app wildcards not supported in Next.js - add specific preview domains as needed
      ],
    },
  },
  async rewrites() {
    return [
      // Proxy Next /api/* to backend /api/* (preserve the /api prefix)
      { source: '/api/:path*', destination: `${API}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;