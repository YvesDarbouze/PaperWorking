/**
 * Lazy-loads the Google Maps JavaScript API with Places library.
 * Ensures the script is loaded only once, even if called multiple times.
 */

let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsApi(): Promise<void> {
  if (loadPromise) return loadPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set. Places Autocomplete unavailable.');
    return Promise.reject(new Error('Google Maps API key not configured'));
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (typeof window !== 'undefined' && window.google?.maps) {
        resolve();
      } else {
        reject(new Error('Google Maps API loaded but maps object not available'));
      }
    };

    script.onerror = () => reject(new Error('Failed to load Google Maps API'));

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps;
}
