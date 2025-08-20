// Next.js config (CJS)
const path = require('path');

const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';
// Normalize to avoid trailing slashes producing //api/... which can 404 on Fastify
const API = RAW_API.replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  experimental: {
    esmExternals: false,
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    // Map '@' to the app root for imports like '@/lib/x'
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  async rewrites() {
    return [
      // API routes: map /api/:path* to backend without /api prefix
      { source: '/api/:path*', destination: `${API}/:path*` },
      // Other routes: map to backend with full path
      { source: '/curator/:path*',   destination: `${API}/curator/:path*` },
      { source: '/evidence/:path*',  destination: `${API}/evidence/:path*` },
      { source: '/learn/:path*',     destination: `${API}/learn/:path*` },
    ];
  },
};

module.exports = nextConfig;