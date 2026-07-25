import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit, rateLimitResponse } from '@/lib/places/publicRateLimit';
import * as PlacesGateway from '@/lib/places/placesGateway';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  // 1. Get client IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 2. Rate limit check (public, IP-based)
  const rateCheck = await checkPublicRateLimit(ip);
  if (!rateCheck.allowed) {
    const response = rateLimitResponse(rateCheck);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }

  // 3. Parse and validate request body
  const { input } = await req.json().catch(() => ({ input: '' }));

  if (!input || typeof input !== 'string' || input.trim().length < 2) {
    const res = NextResponse.json({ predictions: [] });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }

  const normalized = input.trim();

  // Generate server-side session token to obscure from client
  const sessionToken = crypto.randomUUID();

  // 4. Fetch autocomplete predictions from the Gateway
  try {
    const predictions = await PlacesGateway.autocomplete(normalized, sessionToken, 'public');
    
    // 5. Strip out mainText/secondaryText to minimize exposure
    const strippedPredictions = predictions.map(p => ({
      placeId: p.placeId,
      description: p.description
    }));

    const res = NextResponse.json({ predictions: strippedPredictions });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (error) {
    console.error('[Places Autocomplete Public] Gateway error:', error);
    // If Autocomplete fails, return empty predictions
    const res = NextResponse.json({ predictions: [] });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }
}

// Support CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
