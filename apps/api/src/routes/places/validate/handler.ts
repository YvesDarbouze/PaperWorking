import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  mapGoogleValidationResponse,
  parseAddressFallback,
} from '../../../lib/places/validate.js';

export type ValidateAddressFn = (address: string) => Promise<Record<string, unknown>>;

export type CaptureTelemetryFn = (input: {
  uid: string;
  event: string;
  properties: Record<string, unknown>;
}) => Promise<void>;

export interface PlacesValidatePostDeps {
  requireAuth?: RequireAuthFn;
  mapsApiKey?: string | null;
  validateAddress?: ValidateAddressFn;
  captureTelemetry?: CaptureTelemetryFn;
}

/**
 * POST /api/places/validate
 */
export async function handlePlacesValidatePost(
  body: { address?: unknown },
  deps: PlacesValidatePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const apiKey = deps.mapsApiKey;
  if (!apiKey) {
    return jsonResponse(500, { error: 'Google Maps API key not configured' });
  }

  const address = typeof body.address === 'string' ? body.address : '';
  if (!address) {
    return jsonResponse(400, { error: 'address is required' });
  }

  if (deps.captureTelemetry) {
    await deps.captureTelemetry({
      uid: auth.uid,
      event: 'address_validation_called',
      properties: { sku: 'address-validation' },
    });
  }

  try {
    const data = deps.validateAddress
      ? await deps.validateAddress(address)
      : { result: null };

    const mapped = mapGoogleValidationResponse(address, data);
    return jsonResponse(200, mapped);
  } catch (error: unknown) {
    console.warn('[Places Validate] Address Validation API failed, using fallback parsing:', error);
    return jsonResponse(200, parseAddressFallback(address));
  }
}
