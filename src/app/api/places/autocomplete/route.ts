import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { checkRateLimit, rateLimitResponse } from '@/lib/places/placesRateLimit';
import { checkPublicRateLimit } from '@/lib/places/publicRateLimit';
import * as PlacesGateway from '@/lib/places/placesGateway';

export async function POST(req: NextRequest) {
  // 1. Authenticate the request
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  // 2. Rate limit check (principal and IP based)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateCheckIp = await checkPublicRateLimit(ip);
  if (!rateCheckIp.allowed) return rateLimitResponse(rateCheckIp);

  const rateCheck = await checkRateLimit(uid, 'autocomplete');
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck);

  // 3. Parse and validate request body
  const { input, sessionToken } = await req.json().catch(() => ({ input: '', sessionToken: undefined }));

  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Session token is required' },
      { status: 400 }
    );
  }

  if (!input || typeof input !== 'string' || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const normalized = input.trim();

  // 4. Fetch autocomplete predictions from the Gateway
  try {
    const predictions = await PlacesGateway.autocomplete(normalized, sessionToken, uid);
    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('[Places Autocomplete] Gateway error:', error);
    // If Autocomplete fails, return empty predictions
    return NextResponse.json({ predictions: [] });
  }
}
