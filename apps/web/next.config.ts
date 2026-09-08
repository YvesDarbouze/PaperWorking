import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const webDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // App Hosting npm-installs apps/web and writes a second lockfile. Pin tracing to the monorepo root.
  outputFileTracingRoot: path.join(webDir, '../..'),
  // Keep Supabase out of the SSR bundle — avoids Next OTEL stub conflicts.
  serverExternalPackages: [
    'firebase-admin',
    'firebase',
    'firebase/app',
    'firebase/auth',
    '@paperworking/database',
    '@paperworking/identity',
  ],
  // Allow importing root-level /mockdata from apps/web
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    '@paperworking/api',
    '@paperworking/shared',
    '@paperworking/financial-engine',
    '@paperworking/authz',
  ],
  async redirects() {
    return [
      { source: '/account/support', destination: '/support', permanent: false },
      { source: '/dashboard/command-center', destination: '/dashboard', permanent: false },
      { source: '/dashboard/projects', destination: '/projects', permanent: false },
      { source: '/dashboard/projects/:id', destination: '/project/:id', permanent: false },
      { source: '/deal-analyzer', destination: '/dashboard/deals', permanent: false },
      { source: '/dashboard/deal-analyzer', destination: '/dashboard/deals', permanent: false },
    ];
  },
};

export default nextConfig;
