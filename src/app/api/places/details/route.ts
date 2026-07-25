import { NextRequest, NextResponse } from 'next/server';
import { placesCache } from '@/lib/cache/placesCache';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { checkRateLimit, rateLimitResponse } from '@/lib/places/placesRateLimit';
import * as PlacesGateway from '@/lib/places/placesGateway';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const rateCheck = await checkRateLimit(uid, 'placeDetails');
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck);

  const { placeId, sessionToken } = await req.json().catch(() => ({ placeId: '', sessionToken: '' }));

  if (!placeId || typeof placeId !== 'string') {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
  }

  if (!sessionToken || typeof sessionToken !== 'string') {
    return NextResponse.json({ error: 'sessionToken is required' }, { status: 400 });
  }

  const cached = await placesCache.getDetails(placeId);
  if (cached) {
    return NextResponse.json({ ...(cached as object), cached: true });
  }

  try {
    const result = await PlacesGateway.placeDetails(placeId, sessionToken, uid);
    await placesCache.setDetails(placeId, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Places Details] error:', error);
    return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 502 });
  }
}
