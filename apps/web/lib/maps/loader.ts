import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google.maps | null> | null = null;
let hasWarnedMissingKey = false;
let hasWarnedLoadError = false;

/**
 * Returns the configured client-side API key for Google Maps Platform.
 */
export function getClientMapsApiKey(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
}

/**
 * Returns whether a non-empty Google Maps API key is available in the client environment.
 */
export function isMapsKeyConfigured(): boolean {
  return getClientMapsApiKey().length > 0;
}

/**
 * Returns the singleton Loader instance, initializing it if necessary.
 * Libraries loaded: 'places', 'maps', 'marker'.
 */
export function getGoogleMapsLoader(): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: getClientMapsApiKey(),
      version: 'weekly',
      libraries: ['places', 'maps', 'marker'],
    });
  }
  return loaderInstance;
}

/**
 * Loads the Google Maps JavaScript API as an idempotent singleton.
 *
 * Graceful degradation contract:
 * - In SSR/Node environments, returns null immediately.
 * - If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing, logs a single console warning
 *   and returns null without throwing or breaking the UI.
 * - If upstream network fails (e.g. offline, quota, CSP), catches error, logs once,
 *   and returns null so components fall back to plain text search / styled placeholders.
 */
export async function loadGoogleMaps(): Promise<typeof google.maps | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  // Already loaded in window
  if (window.google?.maps?.places) {
    return window.google.maps;
  }

  const key = getClientMapsApiKey();
  if (!key) {
    if (!hasWarnedMissingKey) {
      console.warn(
        '[PaperWorking Maps] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured in client environment. ' +
          'Address autocomplete and static property maps will gracefully degrade to standard inputs and theme placeholders.',
      );
      hasWarnedMissingKey = true;
    }
    return null;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      await getGoogleMapsLoader().load();
      return window.google?.maps || null;
    } catch (err: unknown) {
      if (!hasWarnedLoadError) {
        console.warn(
          '[PaperWorking Maps] Failed to load Google Maps JavaScript API script. Gracefully degrading.',
          err,
        );
        hasWarnedLoadError = true;
      }
      return null;
    }
  })();

  return loadPromise;
}

/**
 * Checks synchronously whether Google Maps and Places library are currently ready in window.
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.maps?.places);
}

/**
 * Test helper to reset internal singleton state between tests.
 */
export function resetGoogleMapsLoaderForTesting(): void {
  loaderInstance = null;
  loadPromise = null;
  hasWarnedMissingKey = false;
  hasWarnedLoadError = false;
}
