// Property Data Provider — abstraction layer for property enrichment.
//
// Candidate integrations:
//   - RentCast  https://app.rentcast.io/docs            (AVM, rent estimates, comps)
//   - ATTOM     https://api.attomdata.com               (deep property data, history)
//   - Mashvisor https://www.mashvisor.com/api-docs      (investment analytics)
//   - Realty Mole / PriceLabs / PropStream              (various coverage)
//
// Note: Zillow does not expose property data via a public API.
//
// The mock implementation derives deterministic, realistic data from the
// placeId/address hash so the UI is fully populated without credentials.

export interface PropertyFacts {
  photoUrl?:           string;
  beds?:               number;
  baths?:              number;
  sqft?:               number;
  yearBuilt?:          number;
  lotSqft?:            number;
  propertyType?:       string;
  listPriceCents?:     number;
  estRentCents?:       number;
  lastSoldPriceCents?: number;
  lastSoldDate?:       Date;
  sourceProvider:      string;
  fetchedAt:           Date;
}

export interface Comp {
  addressLine:    string;
  soldPriceCents: number;
  soldDate:       Date;
  beds?:          number;
  baths?:         number;
  sqft?:          number;
  distanceMiles?: number;
}

export interface PropertyDataProvider {
  getFacts(addressOrPlaceId: string): Promise<PropertyFacts>;
  getComps(addressOrPlaceId: string): Promise<Comp[]>;
}

export type PropertyProviderType = "mock" | "rentcast" | "attom" | "mashvisor";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seeded(seed: number, min: number, max: number): number {
  const s = ((seed * 1664525 + 1013904223) >>> 0);
  return min + (s % (max - min + 1));
}

const PROPERTY_TYPES = ["Single Family", "Multi-Family", "Condo", "Townhouse", "Duplex"];
const COMP_STREETS   = [
  "Oak St", "Maple Ave", "Cedar Ln", "Park Blvd", "Main St",
  "Elm Dr", "Pine Rd", "Washington Ave", "Lincoln St", "Jefferson Blvd",
];
const UNSPLASH_HOUSES = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80",
];

// ─── Mock implementation ───────────────────────────────────────────────────────

export class MockPropertyDataProvider implements PropertyDataProvider {
  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    await new Promise(r => setTimeout(r, 600)); // simulate API latency
    const h = hashCode(addressOrPlaceId);

    const beds       = seeded(h,       2, 5);
    const baths      = seeded(h + 1,   1, 4);
    const sqft       = seeded(h + 2,   900, 3_200);
    const yearBuilt  = seeded(h + 3,   1940, 2020);
    const lotSqft    = seeded(h + 4,   3_000, 12_000);
    const typeIdx    = h % PROPERTY_TYPES.length;
    const listPrice  = seeded(h + 5,   250_000, 1_200_000);
    const estRent    = seeded(h + 6,   1_200, 4_500);
    const lastSold   = seeded(h + 7,   180_000, 950_000);
    const daysAgo    = seeded(h + 8,   30, 730);
    const photoIdx   = h % UNSPLASH_HOUSES.length;

    return {
      photoUrl:           UNSPLASH_HOUSES[photoIdx],
      beds,
      baths:              baths + 0.5 * (h % 2),
      sqft,
      yearBuilt,
      lotSqft,
      propertyType:       PROPERTY_TYPES[typeIdx],
      listPriceCents:     listPrice * 100,
      estRentCents:       estRent * 100,
      lastSoldPriceCents: lastSold * 100,
      lastSoldDate:       new Date(Date.now() - daysAgo * 86_400_000),
      sourceProvider:     "MockPropertyProvider v1",
      fetchedAt:          new Date(),
    };
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    await new Promise(r => setTimeout(r, 400));
    const h = hashCode(addressOrPlaceId);

    return Array.from({ length: 6 }, (_, i) => {
      const sh = h + i * 137;
      const num    = seeded(sh,     100, 4_999);
      const street = COMP_STREETS[(sh) % COMP_STREETS.length];
      const price  = seeded(sh + 1, 220_000, 1_100_000);
      const days   = seeded(sh + 2, 14, 365);
      const beds   = seeded(sh + 3, 2, 5);
      const baths  = seeded(sh + 4, 1, 4);
      const sqft   = seeded(sh + 5, 850, 3_000);
      const dist   = (seeded(sh + 6, 10, 200)) / 100; // 0.10–2.00 miles

      return {
        addressLine:    `${num} ${street}`,
        soldPriceCents: price * 100,
        soldDate:       new Date(Date.now() - days * 86_400_000),
        beds,
        baths:          baths + 0.5 * (sh % 2),
        sqft,
        distanceMiles:  parseFloat(dist.toFixed(2)),
      };
    });
  }
}

// ─── RentCast Provider Skeleton ───────────────────────────────────────────────

export class RentCastPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    console.log(`📡 [RentCast] Fetching facts for: ${addressOrPlaceId}`);
    
    // SKELETON INTEGRATION DETAIL:
    // Endpoint: GET https://api.rentcast.io/v1/properties/AVM
    // Headers: { 'X-Api-Key': this.apiKey }
    // Params: { address: addressOrPlaceId }
    
    const mock = new MockPropertyDataProvider();
    const facts = await mock.getFacts(addressOrPlaceId);
    facts.sourceProvider = "RentCast AVM (Skeleton)";
    return facts;
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    console.log(`📡 [RentCast] Fetching comps for: ${addressOrPlaceId}`);
    
    // SKELETON INTEGRATION DETAIL:
    // Endpoint: GET https://api.rentcast.io/v1/comps/rental or GET https://api.rentcast.io/v1/comps/sale
    // Headers: { 'X-Api-Key': this.apiKey }
    // Params: { address: addressOrPlaceId, radius: 2, limit: 10 }
    
    const mock = new MockPropertyDataProvider();
    const comps = await mock.getComps(addressOrPlaceId);
    return comps.map(c => ({
      ...c,
      addressLine: `${c.addressLine} (RentCast Comp)`,
    }));
  }
}

// ─── ATTOM Provider Skeleton ──────────────────────────────────────────────────

export class AttomPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    console.log(`📡 [ATTOM] Fetching facts for: ${addressOrPlaceId}`);

    // SKELETON INTEGRATION DETAIL:
    // Endpoint: GET https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail
    // Headers: { 'apikey': this.apiKey, 'Accept': 'application/json' }
    // Params: { address1: addressOrPlaceId }

    const mock = new MockPropertyDataProvider();
    const facts = await mock.getFacts(addressOrPlaceId);
    facts.sourceProvider = "ATTOM Property API (Skeleton)";
    return facts;
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    console.log(`📡 [ATTOM] Fetching comps for: ${addressOrPlaceId}`);

    // SKELETON INTEGRATION DETAIL:
    // Endpoint: GET https://api.gateway.attomdata.com/propertyapi/v1.0.0/salescomparison/detail
    // Headers: { 'apikey': this.apiKey, 'Accept': 'application/json' }
    // Params: { address1: addressOrPlaceId }

    const mock = new MockPropertyDataProvider();
    const comps = await mock.getComps(addressOrPlaceId);
    return comps.map(c => ({
      ...c,
      addressLine: `${c.addressLine} (ATTOM Comp)`,
    }));
  }
}

// ─── Mashvisor Provider Skeleton ──────────────────────────────────────────────

export class MashvisorPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    console.log(`📡 [Mashvisor] Fetching facts for: ${addressOrPlaceId}`);

    // SKELETON INTEGRATION DETAIL:
    // Endpoint: GET https://api.mashvisor.com/v1.1/property/detail
    // Headers: { 'x-api-key': this.apiKey }
    // Params: { address: addressOrPlaceId }

    const mock = new MockPropertyDataProvider();
    const facts = await mock.getFacts(addressOrPlaceId);
    facts.sourceProvider = "Mashvisor API (Skeleton)";
    return facts;
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    console.log(`📡 [Mashvisor] Fetching comps for: ${addressOrPlaceId}`);

    // SKELETON INTEGRATION DETAIL:
    // Endpoint: GET https://api.mashvisor.com/v1.1/property/comps
    // Headers: { 'x-api-key': this.apiKey }
    // Params: { address: addressOrPlaceId }

    const mock = new MockPropertyDataProvider();
    const comps = await mock.getComps(addressOrPlaceId);
    return comps.map(c => ({
      ...c,
      addressLine: `${c.addressLine} (Mashvisor Comp)`,
    }));
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getPropertyProvider(type?: string): PropertyDataProvider {
  const providerType = (type || process.env.PROPERTY_DATA_PROVIDER || "mock").toLowerCase();

  switch (providerType) {
    case "rentcast": {
      const key = process.env.RENTCAST_API_KEY;
      if (!key) {
        console.warn("⚠️ [PROPERTY PROVIDER] RENTCAST_API_KEY is missing. Falling back to MockPropertyDataProvider.");
        return new MockPropertyDataProvider();
      }
      return new RentCastPropertyProvider(key);
    }
    case "attom": {
      const key = process.env.ATTOM_API_KEY;
      if (!key) {
        console.warn("⚠️ [PROPERTY PROVIDER] ATTOM_API_KEY is missing. Falling back to MockPropertyDataProvider.");
        return new MockPropertyDataProvider();
      }
      return new AttomPropertyProvider(key);
    }
    case "mashvisor": {
      const key = process.env.MASHVISOR_API_KEY;
      if (!key) {
        console.warn("⚠️ [PROPERTY PROVIDER] MASHVISOR_API_KEY is missing. Falling back to MockPropertyDataProvider.");
        return new MockPropertyDataProvider();
      }
      return new MashvisorPropertyProvider(key);
    }
    case "mock":
    default:
      return new MockPropertyDataProvider();
  }
}

export const defaultPropertyProvider: PropertyDataProvider = getPropertyProvider();
