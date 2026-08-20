export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
}

export function validatePlaceDetailsBody(
  body: { placeId?: unknown; sessionToken?: unknown },
): { ok: true; placeId: string; sessionToken: string } | { ok: false; error: string; status: number } {
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';

  if (!placeId) {
    return { ok: false, error: 'placeId is required', status: 400 };
  }
  if (!sessionToken) {
    return { ok: false, error: 'sessionToken is required', status: 400 };
  }

  return { ok: true, placeId, sessionToken };
}

export function validateAutocompleteBody(
  body: { input?: unknown; sessionToken?: unknown },
): { ok: true; input: string; sessionToken: string | undefined } | { ok: false; error: string; status: number } {
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : undefined;
  if (!sessionToken) {
    return { ok: false, error: 'Session token is required', status: 400 };
  }

  const input = typeof body.input === 'string' ? body.input.trim() : '';
  return { ok: true, input, sessionToken };
}

export function validatePublicAutocompleteBody(
  body: { input?: unknown },
): { ok: true; input: string } | { ok: false; predictions: [] } {
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (!input || input.length < 2) {
    return { ok: false, predictions: [] };
  }
  return { ok: true, input };
}

export function stripPublicPredictions(predictions: PlacePrediction[]): Array<{ placeId: string; description: string }> {
  return predictions.map((p) => ({
    placeId: p.placeId,
    description: p.description,
  }));
}

export const PLACES_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;
