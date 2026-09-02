import type { MetadataRoute } from 'next';

/** PWA manifest — Yves brand utility icons (V0 Yves-update-UI parity). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PaperWorking',
    short_name: 'PaperWorking',
    description: 'Real Estate Investment Operating System',
    start_url: '/',
    display: 'standalone',
    background_color: '#121014',
    theme_color: '#121014',
    icons: [
      {
        src: '/brand/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/pwa-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
