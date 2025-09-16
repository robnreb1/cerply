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
  },
};

module.exports = nextConfig;