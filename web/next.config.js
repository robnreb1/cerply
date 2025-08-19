// web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
    return [
      // PROXY: /api/... (frontend)  ->  {base}/... (backend)
      { source: '/api/:path*', destination: `${base}/:path*` },
      // (keep any other rewrites you already have)
    ];
  },
};

module.exports = nextConfig;