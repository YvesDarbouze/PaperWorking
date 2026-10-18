import { NextRequest, NextResponse } from 'next/server';
import { handleMapTileGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export const dynamic = 'force-dynamic';

function generateFallbackSvg(lat: number, lng: number, maptype: string, w: number, h: number): { buffer: ArrayBuffer; contentType: string } {
  const isSatellite = maptype === 'satellite' || maptype === 'hybrid';
  const bg = isSatellite ? '#0f1712' : '#141218';
  const gridColor = isSatellite ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.08)';
  const roadColor = isSatellite ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.12)';
  const accent = '#10b981';
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="${bg}" />
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${gridColor}" stroke-width="1"/>
      </pattern>
      <radialGradient id="satellite-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#grid)" />
    <line x1="0" y1="${cy - 85}" x2="${w}" y2="${cy - 85}" stroke="${roadColor}" stroke-width="10" />
    <line x1="${cx - 140}" y1="0" x2="${cx - 140}" y2="${h}" stroke="${roadColor}" stroke-width="8" />
    <line x1="${cx + 150}" y1="0" x2="${cx + 150}" y2="${h}" stroke="${roadColor}" stroke-width="6" />
    <circle cx="${cx}" cy="${cy}" r="${Math.round(Math.min(w, h) / 3)}" fill="url(#satellite-glow)" />
    <rect x="${cx - 75}" y="${cy - 52}" width="150" height="104" fill="rgba(16,185,129,0.07)" stroke="${accent}" stroke-width="1.5" stroke-dasharray="5,4" />
    <rect x="${cx - 38}" y="${cy - 26}" width="76" height="52" fill="rgba(16,185,129,0.12)" stroke="${accent}" stroke-width="1" />
    <line x1="${cx}" y1="${cy - 20}" x2="${cx}" y2="${cy + 20}" stroke="${accent}" stroke-width="1.75" />
    <line x1="${cx - 20}" y1="${cy}" x2="${cx + 20}" y2="${cy}" stroke="${accent}" stroke-width="1.75" />
    <circle cx="${cx}" cy="${cy}" r="4" fill="${accent}" />
    <rect x="${cx - 135}" y="${cy + 62}" width="270" height="22" fill="rgba(10,14,12,0.82)" stroke="rgba(16,185,129,0.35)" stroke-width="1" />
    <text x="${cx}" y="${cy + 77}" text-anchor="middle" font-family="monospace" font-size="10" fill="${accent}" font-weight="bold">
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
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';

  const width = Math.min(Math.max(parseInt(w || '640', 10) || 640, 64), 1280);
  const height = Math.min(Math.max(parseInt(h || '320', 10) || 320, 64), 640);
  const numericLat = Number.isFinite(parseFloat(lat || '')) ? parseFloat(lat!) : 30.2672;
  const numericLng = Number.isFinite(parseFloat(lng || '')) ? parseFloat(lng!) : -97.7431;

  const result = await handleMapTileGet(
    { lat, lng, zoom, w, h, maptype },
    {
      requireAuth: async () => ({ uid }),
      placesApiKey: apiKey || 'svg-fallback-mode',
      fetchTile: async (url: string) => {
        if (!apiKey || apiKey.includes('Fake')) {
          return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
        }
        try {
          const res = await fetch(url);
          const contentType = res.headers.get('content-type') || 'image/png';
          const hasStaticMapWarning = Boolean(res.headers.get('x-staticmap-api-warning'));
          if (!res.ok || !contentType.startsWith('image/') || hasStaticMapWarning) {
            return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
          }
          const buffer = await res.arrayBuffer();
          if (!buffer || buffer.byteLength === 0) {
            return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
          }
          return { buffer, contentType };
        } catch {
          return generateFallbackSvg(numericLat, numericLng, maptype, width, height);
        }
      },
    },
  );

  return toNextResponse(result);
}
