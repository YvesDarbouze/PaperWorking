import { NextRequest, NextResponse } from 'next/server';
import { handleMapTileGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export const dynamic = 'force-dynamic';

function generateFallbackSvg(lat: number, lng: number, maptype: string, w: number, h: number): { buffer: ArrayBuffer; contentType: string } {
  const isSatellite = maptype === 'satellite' || maptype === 'hybrid';
  const bg = isSatellite ? '#0f1712' : '#141218';
  const gridColor = isSatellite ? 'rgba(0, 221, 148, 0.12)' : 'rgba(255, 255, 255, 0.08)';
  const accent = '#10b981';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${bg}" />
    <!-- Grid overlay representing parcel satellite coordinates -->
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${gridColor}" stroke-width="1"/>
      </pattern>
      <radialGradient id="satellite-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grid)" />
    <circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="url(#satellite-glow)" />
    <!-- Parcel boundary box -->
    <rect x="${w / 2 - 60}" y="${h / 2 - 45}" width="120" height="90" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4,4" rx="4" />
    <!-- Crosshairs -->
    <line x1="${w / 2}" y1="${h / 2 - 20}" x2="${w / 2}" y2="${h / 2 + 20}" stroke="${accent}" stroke-width="2" />
    <line x1="${w / 2 - 20}" y1="${h / 2}" x2="${w / 2 + 20}" y2="${h / 2}" stroke="${accent}" stroke-width="2" />
    <circle cx="${w / 2}" cy="${h / 2}" r="4" fill="${accent}" />
    <!-- Metadata label -->
    <rect x="12" y="${h - 32}" width="220" height="22" rx="4" fill="rgba(0,0,0,0.7)" />
    <text x="20" y="${h - 17}" font-family="monospace" font-size="10" fill="${accent}" font-weight="bold">
      ${isSatellite ? 'SATELLITE' : 'ROADMAP'}: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
    </text>
  </svg>`;

  const buffer = new TextEncoder().encode(svg).buffer;
  return { buffer, contentType: 'image/svg+xml' };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const zoom = searchParams.get('zoom');
  const w = searchParams.get('w');
  const h = searchParams.get('h');
  const maptype = searchParams.get('maptype') || 'roadmap';

  const authUser = await tryDevSessionAuth();
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const uid = authUser?.uid || `guest-${clientIp}`;

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  const width = Math.min(Math.max(parseInt(w || '640', 10), 64), 1280);
  const height = Math.min(Math.max(parseInt(h || '320', 10), 64), 640);
  const numericLat = parseFloat(lat || '30.2672');
  const numericLng = parseFloat(lng || '-97.7431');

  const result = await handleMapTileGet(
    { lat, lng, zoom, w, h, maptype },
    {
      requireAuth: async () => ({ uid }),
      placesApiKey: apiKey,
      fetchTile: async (url: string) => {
        if (!apiKey || apiKey.includes('Fake')) {
          return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
        }
        try {
          const res = await fetch(url);
          if (!res.ok) {
            return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
          }
          const buffer = await res.arrayBuffer();
          const contentType = res.headers.get('content-type') || 'image/png';
          return { buffer, contentType };
        } catch {
          return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
        }
      },
    },
  );

  return toNextResponse(result);
}
