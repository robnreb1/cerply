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

  // Canary header so we can verify THIS file is active.
  async headers() {
    return [
      { source: '/:path*', headers: [{ key: 'x-next-config', value: 'loaded' }] },
      { source: '/api/:path*', headers: [{ key: 'x-next-rewrite', value: 'true' }] },
      { source: '/ping', headers: [{ key: 'x-next-rewrite', value: 'true' }] },
    ];
  },

  // Rewrites: preserve /api prefix; special-case /api/prompts; add /ping diag
  async rewrites() {
    return [
      { source: '/ping', destination: 'https://httpbin.org/status/204' },
      { source: '/api/prompts', destination: `${API}/prompts` },
      { source: '/api/:path*', destination: `${API}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;