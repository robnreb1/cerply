const RAW_API =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';
// remove any trailing slashes to avoid //api/... which can 404 on Fastify
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
  },
};

module.exports = nextConfig;