import { NextRequest, NextResponse } from 'next/server';
import { handlePlacesGeocodeGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { requireDevSessionAuth, isDevAuthFailure } from '@/lib/projects/dev-session-auth';
import { getAdminCachedGeocode, setAdminCachedGeocode } from '@/lib/maps/geocode-cache-admin';
import { setMemoryCachedGeocode, type CachedGeocode } from '@/lib/maps/geocode-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  const auth = await requireDevSessionAuth();

  // 1. Read-through cache: check durable Firestore cache via Admin SDK before hitting Google
  if (address && address.trim()) {
    const cached = await getAdminCachedGeocode(address);
    if (cached && cached.lat != null && cached.lng != null) {
      // Warm in-memory cache as well
      setMemoryCachedGeocode(address, cached);
      return NextResponse.json({
        lat: cached.lat,
        lng: cached.lng,
        formattedAddress: cached.formattedAddress || address,
        placeId: cached.placeId,
        cached: true,
      });
    }
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  const result = await handlePlacesGeocodeGet(
    { address },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      placesApiKey: apiKey,
      fetchGeocode: async (addr: string, key: string) => {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`;
        const res = await fetch(url);
        return (await res.json()) as Record<string, unknown>;
      },
    },
  );

  // 2. On successful geocode resolution, persist to Firestore via Admin SDK
  if (result.status === 200 && address && address.trim()) {
    try {
      const parsedBody =
        typeof result.body === 'string'
          ? (JSON.parse(result.body) as {
              lat: number | null;
              lng: number | null;
              formattedAddress: string | null;
            })
          : (result.body as {
              lat: number | null;
              lng: number | null;
              formattedAddress: string | null;
            });

      if (parsedBody && parsedBody.lat != null && parsedBody.lng != null) {
        const cacheEntry: CachedGeocode = {
          lat: parsedBody.lat,
          lng: parsedBody.lng,
          formattedAddress: parsedBody.formattedAddress || address,
          resolvedAt: new Date().toISOString(),
        };
        await setAdminCachedGeocode(address, cacheEntry);
        setMemoryCachedGeocode(address, cacheEntry);
      }
    } catch {
      // Ignore serialization or persistence failures to keep response resilient
    }
  }

  return toNextResponse(result);
}
