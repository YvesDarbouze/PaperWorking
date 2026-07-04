import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['firebase-admin'],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react', 'recharts'],
    turbopackFileSystemCacheForDev: false,
  },
  // webpack: (config, { dev }) => {
  //   if (dev) {
  //     config.cache = false;
  //   }
  //   return config;
  // },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // COOP removed — 'same-origin-allow-popups' caused Firebase v12 to
          // silently fall back from signInWithPopup to signInWithRedirect,
          // which then fails due to cross-origin storage partitioning.
          // signInWithPopup uses postMessage (not window.opener), so no
          // COOP header is needed for secure cross-origin popup auth.
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Clickjacking protection (belt-and-suspenders with CSP frame-ancestors)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Limit referrer information sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable browser features not needed by the app
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Force HTTPS for 1 year (only effective in production behind TLS)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Content Security Policy
          // unsafe-inline required: Next.js App Router injects inline scripts for hydration.
          // unsafe-eval required: Next.js dev mode + some Firebase SDK paths.
          // Tighten with nonce-based CSP once middleware nonce injection is wired in.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + Next.js inline hydration + Firebase + Google + Stripe + FB
              // apis.google.com is NOT a subdomain of googleapis.com — must be listed separately
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' apis.google.com *.googleapis.com *.gstatic.com accounts.google.com connect.facebook.net js.stripe.com www.googletagmanager.com",
              // Styles: self + inline (Tailwind CSS-in-JS) + Google Fonts
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              // Fonts
              "font-src 'self' fonts.gstatic.com",
              // Images: self + data URIs + Google + CDN thumbnails
              "img-src 'self' data: blob: *.googleapis.com *.gstatic.com *.googleusercontent.com *.bridgedataoutput.com *.facebook.com *.fbcdn.net",
              // XHR/fetch/WebSocket: Firebase, Bridge API, Google Places, Stripe, Neon, FB OAuth
              "connect-src 'self' apis.google.com *.googleapis.com *.firebaseio.com wss://*.firebaseio.com *.firebaseapp.com api.bridgedataoutput.com places.googleapis.com *.stripe.com *.google-analytics.com *.analytics.google.com neon.tech *.neon.tech *.facebook.com graph.facebook.com *.sentry.io *.ingest.sentry.io *.ingest.us.sentry.io *.posthog.com",
              // Frames: Firebase auth SDK internal iframes + Stripe + Facebook OAuth
              "frame-src 'self' *.firebaseapp.com accounts.google.com *.stripe.com js.stripe.com *.facebook.com www.facebook.com",
              // Prevent this site from being framed by others
              "frame-ancestors 'self'",
              // Workers: Next.js service worker
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        // Unified FAQ: /faq → /support/faq (single source of truth)
        source: '/faq',
        destination: '/support/faq?category=industry-data',
        permanent: true,
      },
      // ── Deprecated dashboard legacy routes ──────────────────────
      // These sub-routes were consolidated into the Command Center.
      // Server-side 308 redirects preserve bookmarks and email deep links.
      {
        source: '/dashboard/engine-room',
        destination: '/dashboard/command-center',
        permanent: true,
      },
      {
        source: '/dashboard/closing-room',
        destination: '/dashboard/command-center',
        permanent: true,
      },
      {
        source: '/dashboard/evaluation',
        destination: '/dashboard/command-center',
        permanent: true,
      },
      {
        source: '/dashboard/exit-hub',
        destination: '/dashboard/command-center',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Proxy Firebase Auth handler so the OAuth flow stays same-origin
        // with paperworking.co. This prevents browser storage partitioning
        // from breaking signInWithPopup/signInWithRedirect flows.
        source: '/__/auth/:path*',
        destination: 'https://paperworking-97055.firebaseapp.com/__/auth/:path*',
      },
      // Top-level Navigation Route Rewrites
      {
        source: '/tos',
        destination: '/terms',
      },
      {
        source: '/data-room',
        destination: '/dashboard/data-room',
      },
      {
        source: '/data-room/:path*',
        destination: '/dashboard/data-room/:path*',
      },
      {
        source: '/insights',
        destination: '/dashboard/insights',
      },
      {
        source: '/insights/:path*',
        destination: '/dashboard/insights/:path*',
      },
      {
        source: '/tax',
        destination: '/dashboard/tax',
      },
      {
        source: '/tax/:path*',
        destination: '/dashboard/tax/:path*',
      },
      {
        source: '/account',
        destination: '/dashboard/settings',
      },
      {
        source: '/account/:path*',
        destination: '/dashboard/settings/:path*',
      },
      // Per-Project Phase Route Rewrites (Named Aliases -> Numeric Paths)
      {
        source: '/dashboard/projects/:id/acquisition',
        destination: '/dashboard/projects/:id/phase-1',
      },
      {
        source: '/dashboard/projects/:id/acquisition/:path*',
        destination: '/dashboard/projects/:id/phase-1/:path*',
      },
      {
        source: '/dashboard/projects/:id/transaction',
        destination: '/dashboard/projects/:id/phase-2',
      },
      {
        source: '/dashboard/projects/:id/transaction/:path*',
        destination: '/dashboard/projects/:id/phase-2/:path*',
      },
      {
        source: '/dashboard/projects/:id/rehab',
        destination: '/dashboard/projects/:id/phase-3',
      },
      {
        source: '/dashboard/projects/:id/rehab/:path*',
        destination: '/dashboard/projects/:id/phase-3/:path*',
      },
      {
        source: '/dashboard/projects/:id/hold-exit',
        destination: '/dashboard/projects/:id/phase-4',
      },
      {
        source: '/dashboard/projects/:id/hold-exit/:path*',
        destination: '/dashboard/projects/:id/phase-4/:path*',
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "paperworking",
  project: "paperworking-nextjs",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
