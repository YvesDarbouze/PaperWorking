// Address Provider — abstraction layer for geocoding / place search.
//
// Active adapter is selected by NEXT_PUBLIC_ADDRESS_PROVIDER:
//   'google' → GooglePlacesAdapter (calls /api/places/autocomplete — key stays server-side)
//   'mock'   → MockAddressProvider (20 seeded addresses, runs keyless)
//
// The Google Places API key (GOOGLE_PLACES_API_KEY) lives exclusively in the
// Next.js API route — it is never referenced here and cannot appear in the
// client bundle. grep for GOOGLE_PLACES_API_KEY will find it only in
// src/app/api/places/autocomplete/route.ts and src/app/api/places/details/route.ts.

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  addressLine: string; // street number + route, e.g. "123 Main St"
  city: string;
  state: string;       // two-letter abbreviation
  zip: string;
}

export interface AddressSuggestion {
  placeId: string;
  formattedAddress: string; // "123 Main St, Brooklyn, NY 11201"
  lat: number;
  lng: number;
  components: AddressComponents;
}

export interface AddressProvider {
  /** Returns up to 5 suggestions matching the query, debounce on the caller side. */
  autocomplete(query: string): Promise<AddressSuggestion[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses Google's structuredFormat.secondaryText into city/state/zip.
 * Expected input: "Brooklyn, NY 11206, USA" or "Austin, TX 78701".
 * Returns empty strings for any field that cannot be parsed.
 */
function parseSecondaryText(secondaryText: string): Pick<AddressComponents, 'city' | 'state' | 'zip'> {
  const match = secondaryText.match(/^([^,]+),\s*([A-Z]{2})\s+(\d{5})/);
  return {
    city:  match?.[1]?.trim() ?? '',
    state: match?.[2] ?? '',
    zip:   match?.[3] ?? '',
  };
}

// ─── Google Places Adapter ────────────────────────────────────────────────────
//
// Calls the server-side proxy at /api/places/autocomplete.
// The API key (GOOGLE_PLACES_API_KEY) is read only inside that route handler
// and is therefore absent from every client bundle.
//
// lat/lng default to 0 because the Places Autocomplete API does not return
// coordinates — they are resolved by the caller via /api/places/details on
// selection. This matches the pattern already used by AddressAutocomplete.tsx.

export class GooglePlacesAdapter implements AddressProvider {
  async autocomplete(query: string): Promise<AddressSuggestion[]> {
    if (query.trim().length < 3) return [];

    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query.trim() }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const predictions: Array<{
        placeId: string;
        description: string;
        mainText: string;
        secondaryText: string;
      }> = data.predictions ?? [];

      return predictions.slice(0, 5).map((p) => {
        const { city, state, zip } = parseSecondaryText(p.secondaryText ?? '');
        return {
          placeId:          p.placeId,
          formattedAddress: p.description,
          lat: 0,  // resolved via /api/places/details on selection
          lng: 0,
          components: {
            addressLine: p.mainText ?? '',
            city,
            state,
            zip,
          },
        };
      });
    } catch {
      return [];
    }
  }
}

// ─── Mock implementation ───────────────────────────────────────────────────────
// 20 realistic US investment-grade addresses seeded deterministically.
// Results are filtered by substring match so the UI feels like real autocomplete.

const MOCK_ADDRESSES: AddressSuggestion[] = [
  { placeId: "mock_1",  formattedAddress: "312 W 23rd St, New York, NY 10011",       lat: 40.7469, lng: -74.0011, components: { addressLine: "312 W 23rd St",       city: "New York",      state: "NY", zip: "10011" } },
  { placeId: "mock_2",  formattedAddress: "740 Bedford Ave, Brooklyn, NY 11206",      lat: 40.7138, lng: -73.9533, components: { addressLine: "740 Bedford Ave",     city: "Brooklyn",      state: "NY", zip: "11206" } },
  { placeId: "mock_3",  formattedAddress: "2841 N Milwaukee Ave, Chicago, IL 60618",  lat: 41.9329, lng: -87.7011, components: { addressLine: "2841 N Milwaukee Ave", city: "Chicago",       state: "IL", zip: "60618" } },
  { placeId: "mock_4",  formattedAddress: "4208 Melrose Ave, Los Angeles, CA 90029",  lat: 34.0837, lng: -118.2885,components: { addressLine: "4208 Melrose Ave",    city: "Los Angeles",   state: "CA", zip: "90029" } },
  { placeId: "mock_5",  formattedAddress: "1104 Montrose Blvd, Houston, TX 77019",    lat: 29.7415, lng: -95.3894, components: { addressLine: "1104 Montrose Blvd",   city: "Houston",       state: "TX", zip: "77019" } },
  { placeId: "mock_6",  formattedAddress: "815 N 2nd St, Philadelphia, PA 19123",     lat: 39.9614, lng: -75.1412, components: { addressLine: "815 N 2nd St",         city: "Philadelphia",  state: "PA", zip: "19123" } },
  { placeId: "mock_7",  formattedAddress: "3312 N Williams Ave, Portland, OR 97227",  lat: 45.5568, lng: -122.6648,components: { addressLine: "3312 N Williams Ave",   city: "Portland",      state: "OR", zip: "97227" } },
  { placeId: "mock_8",  formattedAddress: "929 Colorado Blvd, Denver, CO 80206",      lat: 39.7278, lng: -104.9398,components: { addressLine: "929 Colorado Blvd",    city: "Denver",        state: "CO", zip: "80206" } },
  { placeId: "mock_9",  formattedAddress: "2201 NW 2nd Ave, Miami, FL 33127",         lat: 25.7975, lng: -80.1963, components: { addressLine: "2201 NW 2nd Ave",      city: "Miami",         state: "FL", zip: "33127" } },
  { placeId: "mock_10", formattedAddress: "404 Dekalb Ave NE, Atlanta, GA 30312",     lat: 33.7603, lng: -84.3632, components: { addressLine: "404 Dekalb Ave NE",    city: "Atlanta",       state: "GA", zip: "30312" } },
  { placeId: "mock_11", formattedAddress: "1627 K St NW, Washington, DC 20006",       lat: 38.9009, lng: -77.0369, components: { addressLine: "1627 K St NW",         city: "Washington",    state: "DC", zip: "20006" } },
  { placeId: "mock_12", formattedAddress: "518 Valencia St, San Francisco, CA 94110", lat: 37.7645, lng: -122.4212,components: { addressLine: "518 Valencia St",      city: "San Francisco", state: "CA", zip: "94110" } },
  { placeId: "mock_13", formattedAddress: "2316 2nd Ave, Seattle, WA 98121",          lat: 47.6155, lng: -122.3453,components: { addressLine: "2316 2nd Ave",         city: "Seattle",       state: "WA", zip: "98121" } },
  { placeId: "mock_14", formattedAddress: "6108 Magazine St, New Orleans, LA 70118",  lat: 29.9284, lng: -90.1146, components: { addressLine: "6108 Magazine St",     city: "New Orleans",   state: "LA", zip: "70118" } },
  { placeId: "mock_15", formattedAddress: "2009 Eastern Ave, Baltimore, MD 21231",    lat: 39.2848, lng: -76.5648, components: { addressLine: "2009 Eastern Ave",     city: "Baltimore",     state: "MD", zip: "21231" } },
  { placeId: "mock_16", formattedAddress: "3901 Laclede Ave, St. Louis, MO 63108",    lat: 38.6348, lng: -90.2502, components: { addressLine: "3901 Laclede Ave",     city: "St. Louis",     state: "MO", zip: "63108" } },
  { placeId: "mock_17", formattedAddress: "1414 NE Alberta St, Portland, OR 97211",   lat: 45.5591, lng: -122.6432,components: { addressLine: "1414 NE Alberta St",   city: "Portland",      state: "OR", zip: "97211" } },
  { placeId: "mock_18", formattedAddress: "822 W 36th St, Baltimore, MD 21211",       lat: 39.3348, lng: -76.6412, components: { addressLine: "822 W 36th St",        city: "Baltimore",     state: "MD", zip: "21211" } },
  { placeId: "mock_19", formattedAddress: "1501 Delmar Blvd, St. Louis, MO 63103",    lat: 38.6341, lng: -90.2165, components: { addressLine: "1501 Delmar Blvd",     city: "St. Louis",     state: "MO", zip: "63103" } },
  { placeId: "mock_20", formattedAddress: "4425 N Central Ave, Phoenix, AZ 85012",    lat: 33.5001, lng: -112.0732,components: { addressLine: "4425 N Central Ave",   city: "Phoenix",       state: "AZ", zip: "85012" } },
];

export class MockAddressProvider implements AddressProvider {
  async autocomplete(query: string): Promise<AddressSuggestion[]> {
    if (query.trim().length < 2) return [];
    await new Promise(r => setTimeout(r, 150)); // realistic debounce feel
    const q = query.toLowerCase();
    return MOCK_ADDRESSES
      .filter(a => a.formattedAddress.toLowerCase().includes(q))
      .slice(0, 5);
  }
}

// ─── Provider selection ───────────────────────────────────────────────────────
//
// NEXT_PUBLIC_ADDRESS_PROVIDER is a build-time flag — safe to bundle because it
// carries no secrets. The actual API key is GOOGLE_PLACES_API_KEY, which has no
// NEXT_PUBLIC_ prefix and therefore never appears in the client bundle.
//
//   NEXT_PUBLIC_ADDRESS_PROVIDER=google  → GooglePlacesAdapter (production)
//   NEXT_PUBLIC_ADDRESS_PROVIDER=mock    → MockAddressProvider  (keyless dev/test)
//   (unset)                              → MockAddressProvider  (safe default)

const ACTIVE_PROVIDER = process.env.NEXT_PUBLIC_ADDRESS_PROVIDER ?? 'mock';

export const defaultAddressProvider: AddressProvider =
  ACTIVE_PROVIDER === 'google'
    ? new GooglePlacesAdapter()
    : new MockAddressProvider();
