// Next.js config (CJS)
const path = require('path');

const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';
// Normalize to avoid trailing slash producing //api/... which can 404 on Fastify
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
      { source: '/api/:path*',       destination: `${API}/api/:path*` },
      { source: '/curator/:path*',   destination: `${API}/curator/:path*` },
      { source: '/evidence/:path*',  destination: `${API}/evidence/:path*` },
      { source: '/learn/:path*',     destination: `${API}/learn/:path*` },
    ];
  },
};

module.exports = nextConfig;
<<<<<<< HEAD
// web/next.config.cjs
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: false,
  },
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {};
    // Map '@' to the web app root to support imports like '@/lib/x'
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
=======
const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL  ||
  'http://localhost:8080';

// strip trailing slashes so we never produce //api/...
const API = RAW_API.replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*',       destination: `${API}/api/:path*` },
      { source: '/curator/:path*',   destination: `${API}/curator/:path*` },
      { source: '/evidence/:path*',  destination: `${API}/evidence/:path*` },
      { source: '/learn/:path*',     destination: `${API}/learn/:path*` },
    ];
>>>>>>> 292294f (fix(web): normalize API base in rewrites to avoid //api 404s on Fastify)
  },
};

module.exports = nextConfig;
