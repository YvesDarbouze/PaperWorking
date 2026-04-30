import { NextRequest, NextResponse } from 'next/server';
import { placesCache } from '@/lib/cache/placesCache';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  if (!PLACES_API_KEY) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    );
  }

  const { placeId } = await req.json().catch(() => ({ placeId: '' }));

  if (!placeId || typeof placeId !== 'string') {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
  }

  const cached = await placesCache.getDetails(placeId);
  if (cached) {
    return NextResponse.json({ ...(cached as object), cached: true });
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'addressComponents,formattedAddress,location',
        },
      }
    );

    if (!response.ok) {
      console.error('[Places Details] API error:', response.status, await response.text());
      return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 502 });
    }

    const data = await response.json();
    const components = data.addressComponents || [];

    const get = (type: string): string => {
      const comp = components.find((c: any) => c.types?.includes(type));
      return comp?.longText || comp?.shortText || '';
    };

    const streetNumber = get('street_number');
    const route = get('route');
    const street = [streetNumber, route].filter(Boolean).join(' ');
    const city =
      get('locality') ||
      get('sublocality') ||
      get('administrative_area_level_2');
    const state =
      components.find((c: any) => c.types?.includes('administrative_area_level_1'))?.shortText ?? '';
    const zip = get('postal_code');

    const result = {
      formattedAddress: data.formattedAddress || '',
      street,
      city,
      state,
      zip,
      lat: data.location?.latitude ?? null,
      lng: data.location?.longitude ?? null,
    };

    await placesCache.setDetails(placeId, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Places Details] Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
