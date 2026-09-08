import { NextRequest } from 'next/server';
import { handleMapTileGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { requireDevSessionAuth, isDevAuthFailure } from '@/lib/projects/dev-session-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const zoom = searchParams.get('zoom');
  const w = searchParams.get('w');
  const h = searchParams.get('h');

  const auth = await requireDevSessionAuth();

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  const result = await handleMapTileGet(
    { lat, lng, zoom, w, h },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      placesApiKey: apiKey,
      fetchTile: async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/png';
        return { buffer, contentType };
      },
    },
  );

  return toNextResponse(result);
}
