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
    const API = getApiBase();
    return [
      // IMPORTANT: preserve the /api prefix in the destination
      { source: '/api/:path*',       destination: `${API}/api/:path*` },
      // Keep curated non-/api rewrites already accepted
      { source: '/curator/:path*',   destination: `${API}/curator/:path*` },
      { source: '/evidence/:path*',  destination: `${API}/evidence/:path*` },
      { source: '/learn/:path*',     destination: `${API}/learn/:path*` },
      { source: '/ping', destination: 'https://httpbin.org/status/204' },
    ];
  },
};

module.exports = nextConfig;