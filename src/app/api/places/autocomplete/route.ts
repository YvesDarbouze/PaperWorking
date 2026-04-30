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

  const { input } = await req.json().catch(() => ({ input: '' }));

  if (!input || typeof input !== 'string' || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const normalized = input.trim();

  const cached = await placesCache.getAutocomplete(normalized);
  if (cached) {
    return NextResponse.json({ predictions: cached, cached: true });
  }

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
        },
        body: JSON.stringify({
          input: normalized,
          includedPrimaryTypes: ['street_address', 'subpremise', 'premise'],
          includedRegionCodes: ['us'],
          languageCode: 'en',
        }),
      }
    );

    if (!response.ok) {
      console.error('[Places Autocomplete] API error:', response.status, await response.text());
      return NextResponse.json({ predictions: [] });
    }

    const data = await response.json();

    const predictions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        description: s.placePrediction.text?.text || '',
        mainText: s.placePrediction.structuredFormat?.mainText?.text || '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
      }));

    await placesCache.setAutocomplete(normalized, predictions);

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('[Places Autocomplete] Proxy error:', error);
    return NextResponse.json({ predictions: [] });
  }
}
