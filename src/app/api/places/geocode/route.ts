import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * GET /api/places/geocode?address=<address>
 *
 * Geocode an address to lat/lng using Google Geocoding API.
 * Used to place agent offices and open house properties on maps.
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim();

  if (!address) {
    return NextResponse.json({ error: 'address parameter is required' }, { status: 400 });
  }

  if (!PLACES_API_KEY) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', PLACES_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('[Geocode] API error:', response.status);
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json({ lat: null, lng: null, formattedAddress: null });
    }

    const result = data.results[0];
    return NextResponse.json({
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    });
  } catch (error) {
    console.error('[Geocode] Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
