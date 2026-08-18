import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { getStreetViewImage } from '@/lib/maps/street-view';

export const dynamic = 'force-dynamic';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * GET /api/street-view?lat=<lat>&lng=<lng>&fov=<fov>&heading=<heading>&pitch=<pitch>&w=<w>&h=<h>&metadata=true|false
 *
 * Proxies Google Street View Static API & Metadata requests server-side.
 * GOOGLE_PLACES_API_KEY remains server-side only.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY;

  const { searchParams } = request.nextUrl;

  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const metadataOnly = searchParams.get('metadata') === 'true';

  if (!isFinite(lat) || !isFinite(lng)) {
    return new NextResponse('lat and lng are required numeric parameters', { status: 400 });
  }

  if (!placesApiKey) {
    return new NextResponse('Street View service not configured', { status: 503 });
  }

  if (metadataOnly) {
    const url = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('key', placesApiKey);

    try {
      const res = await fetch(url.toString());
      const data = await res.json();
      return NextResponse.json(data);
    } catch (err) {
      console.error('[street-view] Metadata error:', err);
      return NextResponse.json({ status: 'ZERO_RESULTS' });
    }
  }

  const fov = Math.min(Math.max(parseInt(searchParams.get('fov') ?? '90', 10), 10), 120);
  const heading = searchParams.get('heading') ? parseInt(searchParams.get('heading')!, 10) : undefined;
  const pitch = Math.min(Math.max(parseInt(searchParams.get('pitch') ?? '0', 10), -90), 90);
  const w = Math.min(Math.max(parseInt(searchParams.get('w') ?? '600', 10), 64), 1280);
  const h = Math.min(Math.max(parseInt(searchParams.get('h') ?? '400', 10), 64), 800);

  const url = new URL('https://maps.googleapis.com/maps/api/streetview');
  url.searchParams.set('size', `${w}x${h}`);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('fov', String(fov));
  url.searchParams.set('pitch', String(pitch));
  if (heading !== undefined) {
    url.searchParams.set('heading', String(heading));
  }
  url.searchParams.set('return_error_code', 'true');
  url.searchParams.set('key', placesApiKey);

  try {
    const upstream = await fetch(url.toString(), { cache: 'no-store' });
    if (!upstream.ok) {
      return new NextResponse('Street View unavailable for location', { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-StreetView-Source': 'google-street-view-static',
      },
    });
  } catch (err) {
    console.error('[street-view] Proxy error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * POST /api/street-view
 * Body: { lat: number, lng: number }
 * Returns: { imageUrl: string | null, metadata: object | null, available: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { lat, lng } = await request.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const result = await getStreetViewImage(lat, lng, {
      width: 1200,
      height: 400,
      fov: 90,
      pitch: 10, // Slight upward angle for better building shots
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Street View API error:', error);
    return NextResponse.json(
      { imageUrl: null, metadata: null, available: false },
      { status: 500 }
    );
  }
}
