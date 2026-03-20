import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/admin',
  assetPrefix: '/admin',
};

export default nextConfig;
