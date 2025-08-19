/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_FF_QUALITY_BAR_V1: process.env.NEXT_PUBLIC_FF_QUALITY_BAR_V1 || 'true',
  },
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
    return [
      { source: '/api/:path*', destination: `${base}/api/:path*` },
      { source: '/curator/:path*', destination: `${base}/curator/:path*` },
    ];
  },
};
export default nextConfig;
