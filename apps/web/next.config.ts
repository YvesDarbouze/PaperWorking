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
      // Historical alias redirects for renamed legacy deal-analyzer routes
      { source: '/deal-analyzer', destination: '/deal-calculator', permanent: true },
      { source: '/dashboard/deal-analyzer', destination: '/deal-calculator', permanent: true },
      { source: '/dashboard/deal-calculator', destination: '/deal-calculator', permanent: true },
      { source: '/dashboard/settings/profile', destination: '/dashboard/profile', permanent: true },
      { source: '/dashboard/settings/billing', destination: '/dashboard/settings?section=billing', permanent: false },
      { source: '/marketplace', destination: '/marketplaces', permanent: true },
      { source: '/project/new', destination: '/projects/new', permanent: true },
      { source: '/dashboard/explore', destination: '/dashboard/deals', permanent: true },
      // Fallback redirect for deal detail paths under dashboard
      { source: '/dashboard/deals/:id', destination: '/marketplace/:id', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https: http: data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: blob:",
              "style-src 'self' 'unsafe-inline' https: http:",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https: http:",
              "connect-src 'self' https: http: wss: ws:",
              "frame-src 'self' https: http:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
