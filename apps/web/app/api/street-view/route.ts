import { NextRequest } from 'next/server';
import { handleStreetViewGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { requireDevSessionAuth, isDevAuthFailure } from '@/lib/projects/dev-session-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const size = searchParams.get('size');
  const w = searchParams.get('w');
  const h = searchParams.get('h');
  const fov = searchParams.get('fov');
  const pitch = searchParams.get('pitch');
  const heading = searchParams.get('heading');
  const metadata = searchParams.get('metadata');

  const auth = await requireDevSessionAuth();

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  let width = w;
  let height = h;
  if (size && (!w || !h)) {
    const parts = size.split('x');
    if (parts.length === 2) {
      width = parts[0];
      height = parts[1];
    }
  }

  const result = await handleStreetViewGet(
    { lat, lng, w: width, h: height, fov, pitch, heading, metadata },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      placesApiKey: apiKey,
      fetchMetadata: async (url: string) => {
        const res = await fetch(url);
        return (await res.json()) as Record<string, unknown>;
      },
      fetchImage: async (url: string) => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return { ok: res.ok, status: res.status, buffer, contentType };
      },
    },
  );

  return toNextResponse(result);
}
