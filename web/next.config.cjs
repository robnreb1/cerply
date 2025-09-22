// Next.js config (CJS)
const path = require('path');

// Load Vercel preview env file when building a preview deployment.
// This keeps local dev builds untouched while enabling preview-specific vars.
try {
  const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_ENV === 'preview';
  if (isPreview) {
    // Load variables from web/.vercel/.env.preview.local
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: path.join(__dirname, '.vercel', '.env.preview.local') });
    // Optional: surface that preview env was loaded during build
    // eslint-disable-next-line no-console
    console.log('[next.config] Loaded .vercel/.env.preview.local for preview build');
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[next.config] Preview env load skipped:', err && (err.message || err));
}

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
      // Single rewrite for /api catch-all → ${API}/:path*
      { source: '/api/:path*', destination: `${API}/:path*` },
      // Keep curated non-/api rewrites already accepted (map to origin)
      { source: '/curator/:path*',  destination: `${API_ORIGIN}/curator/:path*` },
      { source: '/evidence/:path*', destination: `${API_ORIGIN}/evidence/:path*` },
      { source: '/learn/:path*',    destination: `${API_ORIGIN}/learn/:path*` },
      { source: '/ping', destination: 'https://httpbin.org/status/204' },
    ];
  },
};

module.exports = nextConfig;