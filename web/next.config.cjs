// web/next.config.cjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',

  async headers() {
    return [
      // Canary: will appear on every response if THIS build is live
      { source: '/:path*', headers: [{ key: 'x-next-config', value: 'loaded' }] },

      // Mark anything under /api/* as rewritten by Next (diagnostic only)
      { source: '/api/:path*', headers: [{ key: 'x-next-rewrite', value: 'true' }] },
    ];
  },

  async rewrites() {
    const api =
      (process.env.NEXT_PUBLIC_API_BASE ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:8080').replace(/\/+$/, '');

    return [
      // Diagnostic: should return HTTP 204 if rewrites are active
      { source: '/ping', destination: 'https://httpbin.org/status/204' },

      // Backend exposes GET /prompts without /api prefix
      { source: '/api/prompts', destination: `${api}/prompts` },

      // General rule: keep /api prefix for everything else
      { source: '/api/:path*', destination: `${api}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;