// Next.js config (CJS)
const path = require('path');

const getApiBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return raw.replace(/\/+$/, '');
};

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
    const API_ORIGIN = getApiBase();
    const API = `${API_ORIGIN}/api`;
    return [
      // M2 proxy: forward /api/* to backend API
      { source: '/api/:path*', destination: `${API}/:path*` },
      // Additional backend routes
      { source: '/curator/:path*',  destination: `${API_ORIGIN}/curator/:path*` },
      { source: '/evidence/:path*', destination: `${API_ORIGIN}/evidence/:path*` },
      { source: '/learn/:path*',    destination: `${API_ORIGIN}/learn/:path*` },
      { source: '/ping', destination: `${API_ORIGIN}/ping` },
    ];
  },
};

module.exports = nextConfig;