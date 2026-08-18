/**
 * Google Maps JavaScript API type declarations
 * These augment the global Window interface and provide strict typing
 * for all Google Maps API usage in PaperWorking.
 */

// ─── Places Autocomplete ───
export interface GooglePlacesAutocomplete {
  new (
    inputField: HTMLInputElement,
    options?: {
      types?: string[];           // ['address'] or ['geocode']
      componentRestrictions?: { country: string | string[] };
      fields?: string[];          // ['formatted_address', 'geometry', 'place_id']
      strictBounds?: boolean;
    }
  ): GooglePlacesAutocompleteInstance;
}

export interface GooglePlacesAutocompleteInstance {
  addListener(event: 'place_changed', callback: () => void): void;
  getPlace(): GooglePlaceResult;
}

export interface GooglePlaceResult {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location: {
      lat(): number;
      lng(): number;
    };
    viewport?: {
      south: number;
      west: number;
      north: number;
      east: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

// ─── Street View Static API ───
export interface StreetViewStaticOptions {
  location: string;     // "lat,lng" or address string
  size: string;         // "600x400"
  fov?: number;         // Field of view (0-120), default 90
  heading?: number;     // Compass heading (0-360)
  pitch?: number;       // Camera pitch (-90 to 90), default 0
  source?: 'default' | 'outdoor';  // Use 'outdoor' for better building shots
  key: string;
}

// ─── Geocoding API ───
export interface GeocodeResult {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  status: string;
}

// ─── Google Maps Instance Types (for DealMap component) ───
export interface GoogleMapInstance {
  Map: new (
    container: HTMLElement,
    options: {
      center: { lat: number; lng: number };
      zoom: number;
      mapTypeId?: string;
      styles?: Array<unknown>;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      maxZoom?: number;
      minZoom?: number;
    }
  ) => {
    setCenter(center: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
    fitBounds(bounds: GoogleLatLngBounds): void;
    getZoom(): number;
  };
  Circle?: new (options: Record<string, unknown>) => {
    setMap(map: unknown): void;
  };
  Marker: new (options: {
    position: { lat: number; lng: number };
    map?: unknown;
    title?: string;
    icon?: string | { path: number; scale: number; fillColor: string; fillOpacity: number; strokeColor?: string; strokeWeight?: number };
  }) => {
    setMap(map: unknown | null): void;
    addListener?(event: string, handler: () => void): void;
  };
  LatLngBounds: new () => {
    extend(position: { lat: number; lng: number }): void;
  };
  SymbolPath: { CIRCLE: number };
  event: {
    addListener(instance: unknown, event: string, callback: () => void): { remove(): void };
    removeListener(listener: { remove(): void }): void;
    clearInstanceListeners?(instance: unknown): void;
  };
  places?: {
    Autocomplete: GooglePlacesAutocomplete;
  };
}

export interface GoogleLatLngBounds {
  extend(position: { lat: number; lng: number }): void;
}

// ─── Global Window Augmentation ───
declare global {
  interface Window {
    google?: {
      maps?: GoogleMapInstance;
    };
  }
}

// Make this a module so it can be imported
export {};
