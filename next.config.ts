import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: any = {
  output: 'standalone',
  transpilePackages: ['framer-motion', 'motion-dom'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  sentry: {
    autoInstrumentMiddleware: false,
  },
  serverExternalPackages: [
    'firebase-admin',
    'mcp-handler',
    '@modelcontextprotocol/sdk',
  ],
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  webpack: (config: any) => {
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' apis.google.com *.googleapis.com *.gstatic.com accounts.google.com connect.facebook.net js.stripe.com www.googletagmanager.com cdn.plaid.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: *.googleapis.com *.gstatic.com *.googleusercontent.com *.bridgedataoutput.com *.facebook.com *.fbcdn.net",
              "connect-src 'self' apis.google.com *.googleapis.com *.firebaseio.com wss://*.firebaseio.com *.firebaseapp.com api.bridgedataoutput.com places.googleapis.com *.stripe.com *.google-analytics.com *.analytics.google.com neon.tech *.neon.tech *.facebook.com graph.facebook.com *.sentry.io *.ingest.sentry.io *.ingest.us.sentry.io *.posthog.com *.plaid.com",
              "frame-src 'self' *.firebaseapp.com accounts.google.com *.stripe.com js.stripe.com *.facebook.com www.facebook.com cdn.plaid.com",
              "frame-ancestors 'self'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/faq', destination: '/support/faq?category=industry-data', permanent: true },
      { source: '/dashboard/engine-room', destination: '/dashboard/command-center', permanent: true },
      { source: '/dashboard/closing-room', destination: '/dashboard/command-center', permanent: true },
      { source: '/dashboard/evaluation', destination: '/dashboard/command-center', permanent: true },
      { source: '/dashboard/exit-hub', destination: '/dashboard/command-center', permanent: true },
      { source: '/projects', destination: '/dashboard/projects', permanent: true },
      { source: '/dashboard/data-room', destination: '/dashboard/projects', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/__/auth/:path*', destination: 'https://paperworking-97055.firebaseapp.com/__/auth/:path*' },
      { source: '/tos', destination: '/terms' },
      { source: '/insights', destination: '/dashboard/insights' },
      { source: '/insights/:path*', destination: '/dashboard/insights/:path*' },
      { source: '/tax', destination: '/dashboard/tax' },
      { source: '/tax/:path*', destination: '/dashboard/tax/:path*' },
      { source: '/account', destination: '/dashboard/settings' },
      { source: '/account/:path*', destination: '/dashboard/settings/:path*' },
      { source: '/dashboard/projects/:id/acquisition', destination: '/dashboard/projects/:id/phase-1' },
      { source: '/dashboard/projects/:id/acquisition/:path*', destination: '/dashboard/projects/:id/phase-1/:path*' },
      { source: '/dashboard/projects/:id/transaction', destination: '/dashboard/projects/:id/phase-2' },
      { source: '/dashboard/projects/:id/transaction/:path*', destination: '/dashboard/projects/:id/phase-2/:path*' },
      { source: '/dashboard/projects/:id/rehab', destination: '/dashboard/projects/:id/phase-3' },
      { source: '/dashboard/projects/:id/rehab/:path*', destination: '/dashboard/projects/:id/phase-3/:path*' },
      { source: '/dashboard/projects/:id/hold-exit', destination: '/dashboard/projects/:id/phase-4' },
      { source: '/dashboard/projects/:id/hold-exit/:path*', destination: '/dashboard/projects/:id/phase-4/:path*' },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "paperworking",
  project: "paperworking-nextjs",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
