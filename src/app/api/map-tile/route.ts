import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/map-tile?lat=<lat>&lng=<lng>&zoom=<zoom>&w=<w>&h=<h>
 *
 * Proxies a Google Static Maps image so GOOGLE_PLACES_API_KEY never
 * reaches the client bundle.  The response carries a cache-control
 * header — property locations don't change frequently.
 */
export const dynamic = 'force-dynamic';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const lat  = parseFloat(searchParams.get('lat')  ?? '');
  const lng  = parseFloat(searchParams.get('lng')  ?? '');
  const zoom = parseInt(searchParams.get('zoom')   ?? '15', 10);
  const w    = parseInt(searchParams.get('w')      ?? '640', 10);
  const h    = parseInt(searchParams.get('h')      ?? '320', 10);

  if (!isFinite(lat) || !isFinite(lng)) {
    return new NextResponse('lat and lng are required numeric parameters', { status: 400 });
  }

  if (!PLACES_API_KEY) {
    return new NextResponse('Map service not configured', { status: 503 });
  }

  // Clamp dimensions to prevent abuse
  const safeW    = Math.min(Math.max(w, 64), 1280);
  const safeH    = Math.min(Math.max(h, 64), 640);
  const safeZoom = Math.min(Math.max(zoom, 1), 21);

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center',   `${lat},${lng}`);
  url.searchParams.set('zoom',     String(safeZoom));
  url.searchParams.set('size',     `${safeW}x${safeH}`);
  url.searchParams.set('scale',    '2');         // retina
  url.searchParams.set('maptype',  'roadmap');
  // Dark style — matches the app's Luminous Glass dark theme
  url.searchParams.set('style',    'feature:all|element:labels.text.fill|color:0x9E9DA0');
  url.searchParams.append('style', 'feature:all|element:labels.text.stroke|color:0x1a1a1a');
  url.searchParams.append('style', 'feature:water|element:geometry|color:0x0d0a0b');
  url.searchParams.append('style', 'feature:landscape|element:geometry|color:0x181420');
  url.searchParams.append('style', 'feature:road|element:geometry|color:0x2a2230');
  url.searchParams.append('style', 'feature:road.arterial|element:geometry|color:0x312840');
  url.searchParams.append('style', 'feature:road.highway|element:geometry|color:0x3a2e4a');
  url.searchParams.append('style', 'feature:poi|visibility:off');
  url.searchParams.append('style', 'feature:transit|visibility:off');
  // Property pin in the brand secondary color
  url.searchParams.set('markers', `color:0x7A9EAA|size:mid|${lat},${lng}`);
  url.searchParams.set('key',     PLACES_API_KEY);

  try {
    const upstream = await fetch(url.toString(), { cache: 'no-store' });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      console.error('[map-tile] Google Static Maps error:', upstream.status, body);
      return new NextResponse('Map fetch failed', { status: 502 });
    }

    const buffer      = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') ?? 'image/png';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':  contentType,
        // 1-day browser cache; 7-day CDN stale-while-revalidate
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Map-Source':  'google-static-maps',
      },
    });
  } catch (err) {
    console.error('[map-tile] Proxy error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
