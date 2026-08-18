/**
 * PaperWorking Error Resilience Engine — Fallback Ladders
 * 
 * Provides graceful multi-tier fallbacks when primary services degrade or fail.
 */

export interface FallbackLadderResult<T> {
  tierUsed: string;
  data: T;
  isFallback: boolean;
  message?: string;
}

export interface AddressData {
  addressLine: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  source: 'google_autocomplete' | 'manual_input' | 'server_geocoded';
}

/**
 * Address Lookup Fallback Ladder:
 * Tier 1: Google Autocomplete -> Tier 2: Manual Input -> Tier 3: Server Geocoding
 */
export async function executeAddressFallbackLadder(
  rawInput: string,
  autocompleteFn?: () => Promise<AddressData | null>,
  serverGeocodeFn?: () => Promise<AddressData | null>
): Promise<FallbackLadderResult<AddressData>> {
  // Tier 1: Try Autocomplete if function provided
  if (autocompleteFn) {
    try {
      const res = await autocompleteFn();
      if (res) {
        return { tierUsed: 'google_autocomplete', data: res, isFallback: false };
      }
    } catch (_err) {
      // Degrade to Tier 2/3
    }
  }

  // Tier 2: Try Server Geocoding if available
  if (serverGeocodeFn) {
    try {
      const res = await serverGeocodeFn();
      if (res) {
        return {
          tierUsed: 'server_geocoded',
          data: res,
          isFallback: true,
          message: 'Google Autocomplete unavailable. Address validated via server geocoder.',
        };
      }
    } catch (_err) {
      // Degrade to Manual Input
    }
  }

  // Tier 3: Manual Input Fallback
  return {
    tierUsed: 'manual_input',
    data: {
      addressLine: rawInput,
      source: 'manual_input',
    },
    isFallback: true,
    message: 'Address services temporarily unavailable. Manual address input accepted.',
  };
}

export interface StreetViewImageResult {
  imageUrl: string;
  type: 'live_street_view' | 'satellite_tile' | 'svg_blueprint';
}

/**
 * Street View Fallback Ladder:
 * Tier 1: Live Street View -> Tier 2: Satellite Tile -> Tier 3: SVG Blueprint Graphic
 */
export function getStreetViewFallback(
  streetViewUrl: string | null,
  lat?: number,
  lng?: number
): FallbackLadderResult<StreetViewImageResult> {
  if (streetViewUrl) {
    return {
      tierUsed: 'live_street_view',
      data: { imageUrl: streetViewUrl, type: 'live_street_view' },
      isFallback: false,
    };
  }

  if (lat && lng) {
    const satelliteUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=600x300&maptype=satellite&key=fallback`;
    return {
      tierUsed: 'satellite_tile',
      data: { imageUrl: satelliteUrl, type: 'satellite_tile' },
      isFallback: true,
      message: 'Street View image unavailable. Displaying satellite map tile.',
    };
  }

  return {
    tierUsed: 'svg_blueprint',
    data: {
      imageUrl: '/images/placeholders/property-blueprint.svg',
      type: 'svg_blueprint',
    },
    isFallback: true,
    message: 'Property imagery unavailable. Displaying architectural blueprint graphic.',
  };
}
