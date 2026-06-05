// Address Provider — abstraction layer for geocoding / place search.
//
// TODO: Swap MockAddressProvider for a real implementation:
//   - Google Places Autocomplete: https://developers.google.com/maps/documentation/places/web-service/autocomplete
//   - Mapbox Geocoding: https://docs.mapbox.com/api/search/geocoding/
//   - HERE Geocoding: https://developer.here.com/documentation/geocoding-search-api/
//   - Radar: https://radar.com/documentation/api#autocomplete
//
// Note: Zillow does not expose a public geocoding or address-lookup API.

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

// ─── Mock implementation ───────────────────────────────────────────────────────
// 20 realistic US investment-grade addresses seeded deterministically.
// Results are filtered by prefix match so the UI feels like real autocomplete.

const MOCK_ADDRESSES: AddressSuggestion[] = [
  { placeId: "mock_1",  formattedAddress: "312 W 23rd St, New York, NY 10011",       lat: 40.7469, lng: -74.0011, components: { addressLine: "312 W 23rd St",    city: "New York",      state: "NY", zip: "10011" } },
  { placeId: "mock_2",  formattedAddress: "740 Bedford Ave, Brooklyn, NY 11206",      lat: 40.7138, lng: -73.9533, components: { addressLine: "740 Bedford Ave",  city: "Brooklyn",      state: "NY", zip: "11206" } },
  { placeId: "mock_3",  formattedAddress: "2841 N Milwaukee Ave, Chicago, IL 60618",  lat: 41.9329, lng: -87.7011, components: { addressLine: "2841 N Milwaukee Ave", city: "Chicago",   state: "IL", zip: "60618" } },
  { placeId: "mock_4",  formattedAddress: "4208 Melrose Ave, Los Angeles, CA 90029",  lat: 34.0837, lng: -118.2885,components: { addressLine: "4208 Melrose Ave", city: "Los Angeles", state: "CA", zip: "90029" } },
  { placeId: "mock_5",  formattedAddress: "1104 Montrose Blvd, Houston, TX 77019",    lat: 29.7415, lng: -95.3894, components: { addressLine: "1104 Montrose Blvd", city: "Houston",    state: "TX", zip: "77019" } },
  { placeId: "mock_6",  formattedAddress: "815 N 2nd St, Philadelphia, PA 19123",     lat: 39.9614, lng: -75.1412, components: { addressLine: "815 N 2nd St",    city: "Philadelphia",  state: "PA", zip: "19123" } },
  { placeId: "mock_7",  formattedAddress: "3312 N Williams Ave, Portland, OR 97227",  lat: 45.5568, lng: -122.6648,components: { addressLine: "3312 N Williams Ave", city: "Portland",  state: "OR", zip: "97227" } },
  { placeId: "mock_8",  formattedAddress: "929 Colorado Blvd, Denver, CO 80206",      lat: 39.7278, lng: -104.9398,components: { addressLine: "929 Colorado Blvd", city: "Denver",     state: "CO", zip: "80206" } },
  { placeId: "mock_9",  formattedAddress: "2201 NW 2nd Ave, Miami, FL 33127",         lat: 25.7975, lng: -80.1963, components: { addressLine: "2201 NW 2nd Ave",  city: "Miami",         state: "FL", zip: "33127" } },
  { placeId: "mock_10", formattedAddress: "404 Dekalb Ave NE, Atlanta, GA 30312",     lat: 33.7603, lng: -84.3632, components: { addressLine: "404 Dekalb Ave NE", city: "Atlanta",    state: "GA", zip: "30312" } },
  { placeId: "mock_11", formattedAddress: "1627 K St NW, Washington, DC 20006",       lat: 38.9009, lng: -77.0369, components: { addressLine: "1627 K St NW",     city: "Washington",    state: "DC", zip: "20006" } },
  { placeId: "mock_12", formattedAddress: "518 Valencia St, San Francisco, CA 94110", lat: 37.7645, lng: -122.4212,components: { addressLine: "518 Valencia St",  city: "San Francisco", state: "CA", zip: "94110" } },
  { placeId: "mock_13", formattedAddress: "2316 2nd Ave, Seattle, WA 98121",          lat: 47.6155, lng: -122.3453,components: { addressLine: "2316 2nd Ave",     city: "Seattle",       state: "WA", zip: "98121" } },
  { placeId: "mock_14", formattedAddress: "6108 Magazine St, New Orleans, LA 70118",  lat: 29.9284, lng: -90.1146, components: { addressLine: "6108 Magazine St", city: "New Orleans",  state: "LA", zip: "70118" } },
  { placeId: "mock_15", formattedAddress: "2009 Eastern Ave, Baltimore, MD 21231",    lat: 39.2848, lng: -76.5648, components: { addressLine: "2009 Eastern Ave", city: "Baltimore",    state: "MD", zip: "21231" } },
  { placeId: "mock_16", formattedAddress: "3901 Laclede Ave, St. Louis, MO 63108",    lat: 38.6348, lng: -90.2502, components: { addressLine: "3901 Laclede Ave", city: "St. Louis",    state: "MO", zip: "63108" } },
  { placeId: "mock_17", formattedAddress: "1414 NE Alberta St, Portland, OR 97211",   lat: 45.5591, lng: -122.6432,components: { addressLine: "1414 NE Alberta St", city: "Portland",  state: "OR", zip: "97211" } },
  { placeId: "mock_18", formattedAddress: "822 W 36th St, Baltimore, MD 21211",       lat: 39.3348, lng: -76.6412, components: { addressLine: "822 W 36th St",    city: "Baltimore",    state: "MD", zip: "21211" } },
  { placeId: "mock_19", formattedAddress: "1501 Delmar Blvd, St. Louis, MO 63103",    lat: 38.6341, lng: -90.2165, components: { addressLine: "1501 Delmar Blvd", city: "St. Louis",    state: "MO", zip: "63103" } },
  { placeId: "mock_20", formattedAddress: "4425 N Central Ave, Phoenix, AZ 85012",    lat: 33.5001, lng: -112.0732,components: { addressLine: "4425 N Central Ave", city: "Phoenix",   state: "AZ", zip: "85012" } },
];

export class MockAddressProvider implements AddressProvider {
  async autocomplete(query: string): Promise<AddressSuggestion[]> {
    if (query.trim().length < 2) return [];
    // Simulate ~250ms network latency
    await new Promise(r => setTimeout(r, 250));
    const q = query.toLowerCase();
    return MOCK_ADDRESSES
      .filter(a => a.formattedAddress.toLowerCase().includes(q))
      .slice(0, 5);
  }
}

export const defaultAddressProvider: AddressProvider = new MockAddressProvider();
