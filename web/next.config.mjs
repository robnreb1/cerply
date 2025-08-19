/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default {
  reactStrictMode: true,
  async rewrites() {
    return API_BASE
      ? [{ source: '/api/:path*', destination: `${API_BASE}/:path*` }]
      : [];
  },
};