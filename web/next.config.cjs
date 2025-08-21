// web/next.config.cjs
const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';

const API = RAW_API.replace(/\/+$/, ''); // strip trailing slash

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  async rewrites() {
    return [
      // quick diagnostic to prove rewrites are active
      { source: '/ping', destination: 'https://httpbin.org/status/204' },

      // preserve /api prefix when proxying to the backend
      { source: '/api/:path*',      destination: `${API}/api/:path*` },

      // non-/api namespaces used by the app
      { source: '/curator/:path*',  destination: `${API}/curator/:path*` },
      { source: '/evidence/:path*', destination: `${API}/evidence/:path*` },
      { source: '/learn/:path*',    destination: `${API}/learn/:path*` },
    ];
  },
};

module.exports = nextConfig;