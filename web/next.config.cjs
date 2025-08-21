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
  // Removed rewrites to avoid conflict with API routes
  // API routes in app/api/[...path]/route.ts handle all backend proxying
};

module.exports = nextConfig;