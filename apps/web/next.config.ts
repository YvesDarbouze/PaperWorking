import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    '@paperworking/api',
    '@paperworking/shared',
    '@paperworking/financial-engine',
  ],
  async redirects() {
    return [
      { source: '/account/support', destination: '/support', permanent: false },
      { source: '/dashboard/command-center', destination: '/dashboard', permanent: false },
      { source: '/dashboard/projects', destination: '/projects', permanent: false },
      { source: '/dashboard/projects/:id', destination: '/project/:id', permanent: false },
      { source: '/deal-analyzer', destination: '/deal-calculator', permanent: false },
      { source: '/dashboard/deal-analyzer', destination: '/dashboard/deal-calculator', permanent: false },
    ];
  },
};

export default nextConfig;
