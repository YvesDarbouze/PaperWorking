import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: '.next-app',
  output: 'standalone',
  serverExternalPackages: ['firebase-admin'],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react', 'recharts'],
    turbopackFileSystemCacheForDev: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Required for Firebase signInWithPopup (Google/Facebook OAuth)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
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
              "connect-src 'self' apis.google.com *.googleapis.com *.firebaseio.com wss://*.firebaseio.com *.firebaseapp.com api.bridgedataoutput.com places.googleapis.com *.stripe.com *.google-analytics.com *.analytics.google.com neon.tech *.neon.tech *.facebook.com graph.facebook.com",
              // Frames: Firebase auth popups + Stripe + Facebook OAuth dialog
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
};

export default nextConfig;
