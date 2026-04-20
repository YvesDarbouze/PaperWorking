import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Required for Firebase signInWithPopup (Google/Facebook OAuth)
        // Firebase popup auth uses window.closed / window.close across origins.
        // App Hosting defaults to same-origin which blocks those calls.
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
