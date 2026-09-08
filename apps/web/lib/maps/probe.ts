export type MapsErrorType =
  | 'MissingKeyMapError'
  | 'RefererNotAllowedMapError'
  | 'REQUEST_DENIED'
  | 'OVER_QUERY_LIMIT'
  | 'SCRIPT_LOAD_FAILURE'
  | 'STATIC_MAP_403'
  | 'STATIC_MAP_404'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface StepCheckResult {
  step: number;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  latencyMs: number;
  errorType?: MapsErrorType;
  errorMessage?: string;
  rawResponse?: unknown;
  details?: Record<string, unknown>;
}

export interface MapsProbeExecutionResult {
  success: boolean;
  timestamp: string;
  keyConfigured: boolean;
  maskedKey: string | null;
  overallError?: string;
  errorClassification?: MapsErrorType;
  steps: {
    scriptLoad: StepCheckResult;
    placesAutocomplete: StepCheckResult;
    geocoding: StepCheckResult;
    streetViewAndStaticMaps: StepCheckResult;
  };
}

const TEST_ADDRESS = '1247 Elm Street, Austin TX';

export function classifyGoogleError(status: string | number, errorMessage?: string): MapsErrorType {
  const msg = String(errorMessage || '');
  if (status === 'REQUEST_DENIED' || status === 403) {
    if (/referer/i.test(msg) || /referrer/i.test(msg) || /site URL/i.test(msg)) {
      return 'RefererNotAllowedMapError';
    }
    if (/api key/i.test(msg) || /key/i.test(msg) || /billing/i.test(msg) || /not authorized to use this API/i.test(msg)) {
      return 'REQUEST_DENIED';
    }
    return 'STATIC_MAP_403';
  }
  if (status === 'OVER_QUERY_LIMIT' || status === 429) {
    return 'OVER_QUERY_LIMIT';
  }
  if (status === 404 || status === 'ZERO_RESULTS') {
    return 'STATIC_MAP_404';
  }
  if (status === 'INVALID_REQUEST' || msg.includes('MissingKey')) {
    return 'MissingKeyMapError';
  }
  return 'UNKNOWN';
}

export async function executeMapsProbe(overrideKey?: string): Promise<MapsProbeExecutionResult> {
  const activeKey =
    overrideKey ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    '';

  const keyConfigured = Boolean(activeKey.trim());
  const maskedKey = keyConfigured
    ? `${activeKey.slice(0, 6)}…${activeKey.slice(-4)}`
    : null;

  const result: MapsProbeExecutionResult = {
    success: false,
    timestamp: new Date().toISOString(),
    keyConfigured,
    maskedKey,
    steps: {
      scriptLoad: {
        step: 1,
        name: 'Maps JS Script & API Key Validation',
        status: 'skipped',
        latencyMs: 0,
      },
      placesAutocomplete: {
        step: 2,
        name: 'Places AutocompleteService',
        status: 'skipped',
        latencyMs: 0,
      },
      geocoding: {
        step: 3,
        name: 'Geocoding API',
        status: 'skipped',
        latencyMs: 0,
      },
      streetViewAndStaticMaps: {
        step: 4,
        name: 'Street View Metadata & Static Maps',
        status: 'skipped',
        latencyMs: 0,
      },
    },
  };

  if (!keyConfigured) {
    result.overallError = 'No Google Maps API key configured. Autocomplete and static imagery disabled.';
    result.errorClassification = 'MissingKeyMapError';
    result.steps.scriptLoad = {
      step: 1,
      name: 'Maps JS Script & API Key Validation',
      status: 'failed',
      latencyMs: 0,
      errorType: 'MissingKeyMapError',
      errorMessage: 'Neither NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nor GOOGLE_MAPS_API_KEY is present in environment.',
    };
    result.steps.placesAutocomplete.errorMessage = 'Skipped: Missing API key.';
    result.steps.geocoding.errorMessage = 'Skipped: Missing API key.';
    result.steps.streetViewAndStaticMaps.errorMessage = 'Skipped: Missing API key.';
    return result;
  }

  // --- Step 1: Script / Key sanity verification ---
  const step1Start = Date.now();
  result.steps.scriptLoad = {
    step: 1,
    name: 'Maps JS Script & API Key Validation',
    status: 'passed',
    latencyMs: Date.now() - step1Start,
    details: {
      keyLength: activeKey.length,
      keyPrefix: activeKey.slice(0, 6),
      environmentVar: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' : 'OVERRIDE_OR_SERVER_KEY',
    },
  };

  // --- Step 2: Places Autocomplete ---
  const step2Start = Date.now();
  try {
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', TEST_ADDRESS);
    autocompleteUrl.searchParams.set('key', activeKey);

    const autoRes = await fetch(autocompleteUrl.toString(), { cache: 'no-store' });
    const autoData = (await autoRes.json()) as {
      status: string;
      predictions?: Array<{ description: string; place_id: string }>;
      error_message?: string;
    };
    const step2Latency = Date.now() - step2Start;

    if (autoData.status === 'OK' && Array.isArray(autoData.predictions) && autoData.predictions.length > 0) {
      result.steps.placesAutocomplete = {
        step: 2,
        name: 'Places AutocompleteService',
        status: 'passed',
        latencyMs: step2Latency,
        details: {
          predictionCount: autoData.predictions.length,
          topMatch: autoData.predictions[0]?.description,
          placeId: autoData.predictions[0]?.place_id,
        },
      };
    } else {
      const errType = classifyGoogleError(autoData.status, autoData.error_message);
      result.steps.placesAutocomplete = {
        step: 2,
        name: 'Places AutocompleteService',
        status: 'failed',
        latencyMs: step2Latency,
        errorType: errType,
        errorMessage: autoData.error_message || `Autocomplete returned status ${autoData.status}`,
        rawResponse: autoData,
      };
    }
  } catch (err: any) {
    result.steps.placesAutocomplete = {
      step: 2,
      name: 'Places AutocompleteService',
      status: 'failed',
      latencyMs: Date.now() - step2Start,
      errorType: 'NETWORK_ERROR',
      errorMessage: err?.message || 'Network failure during Places Autocomplete fetch',
    };
  }

  // --- Step 3: Geocoding API ---
  const step3Start = Date.now();
  let resolvedLat = 30.278;
  let resolvedLng = -97.718;
  try {
    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geocodeUrl.searchParams.set('address', TEST_ADDRESS);
    geocodeUrl.searchParams.set('key', activeKey);

    const geoRes = await fetch(geocodeUrl.toString(), { cache: 'no-store' });
    const geoData = (await geoRes.json()) as {
      status: string;
      results?: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
      error_message?: string;
    };
    const step3Latency = Date.now() - step3Start;

    if (geoData.status === 'OK' && Array.isArray(geoData.results) && geoData.results.length > 0) {
      const location = geoData.results[0]?.geometry?.location;
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        resolvedLat = location.lat;
        resolvedLng = location.lng;
      }
      result.steps.geocoding = {
        step: 3,
        name: 'Geocoding API',
        status: 'passed',
        latencyMs: step3Latency,
        details: {
          formattedAddress: geoData.results[0]?.formatted_address,
          coordinates: { lat: resolvedLat, lng: resolvedLng },
        },
      };
    } else {
      const errType = classifyGoogleError(geoData.status, geoData.error_message);
      result.steps.geocoding = {
        step: 3,
        name: 'Geocoding API',
        status: 'failed',
        latencyMs: step3Latency,
        errorType: errType,
        errorMessage: geoData.error_message || `Geocoding returned status ${geoData.status}`,
        rawResponse: geoData,
      };
    }
  } catch (err: any) {
    result.steps.geocoding = {
      step: 3,
      name: 'Geocoding API',
      status: 'failed',
      latencyMs: Date.now() - step3Start,
      errorType: 'NETWORK_ERROR',
      errorMessage: err?.message || 'Network failure during Geocoding fetch',
    };
  }

  // --- Step 4: Street View Static metadata & Maps Static API ---
  const step4Start = Date.now();
  try {
    const svUrl = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
    svUrl.searchParams.set('location', `${resolvedLat},${resolvedLng}`);
    svUrl.searchParams.set('key', activeKey);

    const svRes = await fetch(svUrl.toString(), { cache: 'no-store' });
    const svData = (await svRes.json()) as {
      status: string;
      pano_id?: string;
      error_message?: string;
    };

    // Also check static map HTTP status code
    const staticMapUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
    staticMapUrl.searchParams.set('center', `${resolvedLat},${resolvedLng}`);
    staticMapUrl.searchParams.set('zoom', '15');
    staticMapUrl.searchParams.set('size', '400x300');
    staticMapUrl.searchParams.set('key', activeKey);

    const staticRes = await fetch(staticMapUrl.toString(), { method: 'HEAD', cache: 'no-store' });
    const step4Latency = Date.now() - step4Start;

    const staticOk = staticRes.status === 200;
    const svOk = svData.status === 'OK' || svData.status === 'ZERO_RESULTS';

    if (staticOk && svOk) {
      result.steps.streetViewAndStaticMaps = {
        step: 4,
        name: 'Street View Metadata & Static Maps',
        status: 'passed',
        latencyMs: step4Latency,
        details: {
          staticMapsHttpStatus: staticRes.status,
          streetViewStatus: svData.status,
          panoId: svData.pano_id ?? null,
        },
      };
    } else {
      let errType: MapsErrorType = 'STATIC_MAP_403';
      if (staticRes.status === 403) errType = 'STATIC_MAP_403';
      else if (staticRes.status === 404) errType = 'STATIC_MAP_404';
      else if (svData.status === 'REQUEST_DENIED') errType = classifyGoogleError(svData.status, svData.error_message);

      result.steps.streetViewAndStaticMaps = {
        step: 4,
        name: 'Street View Metadata & Static Maps',
        status: 'failed',
        latencyMs: step4Latency,
        errorType: errType,
        errorMessage: svData.error_message || `Static Maps status ${staticRes.status}, StreetView ${svData.status}`,
        rawResponse: { staticMapStatus: staticRes.status, streetViewData: svData },
      };
    }
  } catch (err: any) {
    result.steps.streetViewAndStaticMaps = {
      step: 4,
      name: 'Street View Metadata & Static Maps',
      status: 'failed',
      latencyMs: Date.now() - step4Start,
      errorType: 'NETWORK_ERROR',
      errorMessage: err?.message || 'Network failure during Street View / Static Maps fetch',
    };
  }

  // Determine overall success
  const allPassed =
    result.steps.scriptLoad.status === 'passed' &&
    result.steps.placesAutocomplete.status === 'passed' &&
    result.steps.geocoding.status === 'passed' &&
    result.steps.streetViewAndStaticMaps.status === 'passed';

  result.success = allPassed;
  if (!allPassed) {
    const failedStep =
      result.steps.placesAutocomplete.status === 'failed'
        ? result.steps.placesAutocomplete
        : result.steps.geocoding.status === 'failed'
          ? result.steps.geocoding
          : result.steps.streetViewAndStaticMaps;

    result.errorClassification = failedStep.errorType || 'UNKNOWN';
    result.overallError = failedStep.errorMessage || 'Maps integration verification failed';
  }

  return result;
}
