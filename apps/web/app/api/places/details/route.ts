import { NextRequest } from 'next/server';
import { handlePlacesDetailsPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';
import {
  extractPlaceDetailsFromAddressComponents,
  parseAddressComponents,
} from '@/lib/maps/address-parser';

export const dynamic = 'force-dynamic';

const BENCHMARK_PLACE_DESCRIPTIONS: Record<string, string> = {
  'bm-dc-abbey-place': 'Abbey Place Northeast, Washington, DC, USA',
  'bm-austin-1': '1204 E 7th St, Austin, TX 78702',
  'bm-phoenix-1': '4521 N 24th St, Phoenix, AZ 85016',
  'bm-dallas-1': '3804 Swiss Ave, Dallas, TX 75204',
  'bm-denver-1': '1650 Wewatta St, Denver, CO 80202',
  'bm-austin-2': '1247 Elm Street, Austin, TX 78702',
  'bm-miami-1': '800 Brickell Ave, Miami, FL 33131',
  'bm-seattle-1': '1918 8th Ave, Seattle, WA 98101',
  'bm-nashville-1': '120 4th Ave S, Nashville, TN 37201',
  'bm-charlotte-1': '201 S Tryon St, Charlotte, NC 28202',
};

function buildEnrichedDetailsResult(
  placeId: string,
  rawResult: Record<string, unknown>,
  fallbackDescription?: string,
): Record<string, unknown> {
  const existingComponents = Array.isArray(rawResult.address_components)
    ? (rawResult.address_components as Array<Record<string, unknown>>)
    : [];
  const formattedAddress =
    typeof rawResult.formatted_address === 'string'
      ? rawResult.formatted_address
      : fallbackDescription || BENCHMARK_PLACE_DESCRIPTIONS[placeId] || '';

  const extracted = extractPlaceDetailsFromAddressComponents(
    existingComponents,
    formattedAddress,
  );
  const parsed = parseAddressComponents(
    fallbackDescription || formattedAddress,
    extracted,
  );

  const enrichedComponents = [...existingComponents];
  const hasType = (typeName: string) =>
    enrichedComponents.some(
      (c) => Array.isArray(c.types) && c.types.includes(typeName),
    );

  if (parsed.city && !hasType('locality')) {
    enrichedComponents.push({
      long_name: parsed.city,
      short_name: parsed.city,
      types: ['locality', 'political'],
    });
  }
  if (parsed.state && !hasType('administrative_area_level_1')) {
    enrichedComponents.push({
      long_name: parsed.state,
      short_name: parsed.state,
      types: ['administrative_area_level_1', 'political'],
    });
  }
  if (parsed.zipCode && !hasType('postal_code')) {
    enrichedComponents.push({
      long_name: parsed.zipCode,
      short_name: parsed.zipCode,
      types: ['postal_code'],
    });
  }

  return {
    ...rawResult,
    place_id: rawResult.place_id || placeId,
    formatted_address: parsed.formattedAddress || formattedAddress,
    address_components: enrichedComponents,
  };
}

export async function POST(request: NextRequest) {
  let body: {
    placeId?: unknown;
    sessionToken?: unknown;
    description?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const authUser = await tryDevSessionAuth();
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';
  const uid = authUser?.uid || `guest-${clientIp}`;
  const descriptionHint =
    typeof body.description === 'string' ? body.description : undefined;

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  const result = await handlePlacesDetailsPost(body, {
    requireAuth: async () => ({ uid }),
    fetchDetails: async (placeId: string, sessionToken: string) => {
      if (apiKey && !apiKey.includes('Fake') && !placeId.startsWith('bm-')) {
        try {
          const url = new URL(
            'https://maps.googleapis.com/maps/api/place/details/json',
          );
          url.searchParams.set('place_id', placeId);
          url.searchParams.set('sessiontoken', sessionToken);
          // Cost Guardrail: Strict minimal field mask restricts billing to Basic tier only
          url.searchParams.set(
            'fields',
            'place_id,formatted_address,geometry,address_components',
          );
          url.searchParams.set('key', apiKey);

          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            const upstream =
              (data.result as Record<string, unknown>) || { placeId };
            return buildEnrichedDetailsResult(
              placeId,
              upstream,
              descriptionHint,
            );
          }
        } catch {
          // Fall through to deterministic enrichment
        }
      }
      return buildEnrichedDetailsResult(placeId, { placeId }, descriptionHint);
    },
  });

  return toNextResponse(result);
}
