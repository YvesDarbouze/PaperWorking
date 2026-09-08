import { NextRequest } from 'next/server';
import { handlePlacesDetailsPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { requireDevSessionAuth, isDevAuthFailure } from '@/lib/projects/dev-session-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { placeId?: unknown; sessionToken?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const auth = await requireDevSessionAuth();

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  const result = await handlePlacesDetailsPost(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    fetchDetails: async (placeId: string, sessionToken: string) => {
      if (!apiKey) return { placeId };
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('sessiontoken', sessionToken);
      // Cost Guardrail: Strict minimal field mask restricts billing to Basic tier only
      url.searchParams.set('fields', 'place_id,formatted_address,geometry,address_components');
      url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) return { placeId };
      const data = await res.json();
      return (data.result as Record<string, unknown>) || { placeId };
    },
  });

  return toNextResponse(result);
}
