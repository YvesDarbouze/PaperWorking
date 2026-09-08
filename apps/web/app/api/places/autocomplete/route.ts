import { NextRequest } from 'next/server';
import { handlePlacesAutocompletePost, type PlacePrediction } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { requireDevSessionAuth, isDevAuthFailure } from '@/lib/projects/dev-session-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { input?: unknown; sessionToken?: unknown } = {};
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

  const result = await handlePlacesAutocompletePost(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    fetchAutocomplete: async (input: string, sessionToken: string): Promise<PlacePrediction[]> => {
      if (!apiKey) return [];
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&sessiontoken=${encodeURIComponent(sessionToken)}&components=country:us&types=address&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.status !== 'OK' || !Array.isArray(data.predictions)) {
        return [];
      }
      return data.predictions.map((p: {
        place_id?: string;
        description?: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }) => ({
        placeId: p.place_id || '',
        description: p.description || '',
        mainText: p.structured_formatting?.main_text,
        secondaryText: p.structured_formatting?.secondary_text,
      }));
    },
  });

  return toNextResponse(result);
}
