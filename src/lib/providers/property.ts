// Property Data Provider — abstraction layer for property enrichment.
//
// Canonical provider: RentCast (https://api.rentcast.io/v1)
//   - /properties            → attributes, last sale, tax assessments (30-day TTL)
//   - /avm/value             → value estimate + range + sale comps  (7-day TTL)
//   - /avm/rent/long-term    → rent estimate + range + rental comps (7-day TTL)
//
// Mock provider: deterministic hash-derived data — keyless dev ONLY.
//   Never use mock as the production default.
//   sourceProvider = "MockPropertyProvider v1" makes mock data identifiable.
//
// Cache strategy: every RentCast response cached in Firestore under
//   rentcastPropertyCache/{cacheKey} with fetchedAt + payload.
//
// Estimates are AVMs, not appraisals.
//   Always expose a low/high range. Never render a bare point value.
//   Label source + asOf on every display.

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropertyFacts {
  photoUrl?:                  string;
  beds?:                      number;
  baths?:                     number;
  sqft?:                      number;
  yearBuilt?:                 number;
  lotSqft?:                   number;
  propertyType?:              string;
  listPriceCents?:            number;
  lastSoldPriceCents?:        number;
  lastSoldDate?:              Date;
  // ── Rent estimate (always show range, never bare point) ──────────
  estRentCents?:              number;
  estRentLowCents?:           number;
  estRentHighCents?:          number;
  // ── Value AVM (always show range, never bare point) ──────────────
  avmPriceCents?:             number;
  avmPriceLowCents?:          number;
  avmPriceHighCents?:         number;
  // ── Tax / HOA ────────────────────────────────────────────────────
  annualPropertyTaxCents?:    number;
  taxAssessedValueCents?:     number;
  taxYear?:                   number;
  // ── Provenance (required) ─────────────────────────────────────────
  sourceProvider:             string;
  fetchedAt:                  Date;
  /** ISO-8601 timestamp of the RentCast response */
  asOf?:                      string;
  /** true when served from Firestore cache */
  cached?:                    boolean;
  /** true when cache is stale (live fetch failed) */
  stale?:                     boolean;
  /** true when provider has no coverage for this address */
  noCoverage?:                boolean;
}

export interface Comp {
  addressLine:     string;
  soldPriceCents?: number;
  rentCents?:      number;
  compType:        'SALE' | 'RENTAL';
  soldDate?:       Date;
  listedDate?:     Date;
  beds?:           number;
  baths?:          number;
  sqft?:           number;
  distanceMiles?:  number;
  correlation?:    number;
  daysOnMarket?:   number;
  status?:         string;
}

export interface PropertyDataProvider {
  getFacts(address: string): Promise<PropertyFacts>;
  getComps(address: string): Promise<Comp[]>;
}

export type PropertyProviderType = 'mock' | 'rentcast' | 'attom' | 'mashvisor';

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

const PROPERTY_TYPES = ['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Duplex'];
const COMP_STREETS   = [
  'Oak St', 'Maple Ave', 'Cedar Ln', 'Park Blvd', 'Main St',
  'Elm Dr', 'Pine Rd', 'Washington Ave', 'Lincoln St', 'Jefferson Blvd',
];
const UNSPLASH_HOUSES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80',
];

// ─── Mock Provider ─────────────────────────────────────────────────────────────

export class MockPropertyDataProvider implements PropertyDataProvider {
  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    await new Promise(r => setTimeout(r, 600));
    const h = hashCode(addressOrPlaceId);

    const beds      = seeded(h,       2, 5);
    const baths     = seeded(h + 1,   1, 4);
    const sqft      = seeded(h + 2,   900, 3_200);
    const yearBuilt = seeded(h + 3,   1940, 2020);
    const lotSqft   = seeded(h + 4,   3_000, 12_000);
    const typeIdx   = h % PROPERTY_TYPES.length;
    const listPrice = seeded(h + 5,   250_000, 1_200_000);
    const estRent   = seeded(h + 6,   1_200, 4_500);
    const lastSold  = seeded(h + 7,   180_000, 950_000);
    const daysAgo   = seeded(h + 8,   30, 730);
    const photoIdx  = h % UNSPLASH_HOUSES.length;
    const avmPrice  = seeded(h + 9,   230_000, 1_100_000);

    return {
      photoUrl:            UNSPLASH_HOUSES[photoIdx],
      beds,
      baths:               baths + 0.5 * (h % 2),
      sqft,
      yearBuilt,
      lotSqft,
      propertyType:        PROPERTY_TYPES[typeIdx],
      listPriceCents:      listPrice * 100,
      estRentCents:        estRent * 100,
      estRentLowCents:     Math.round(estRent * 0.85) * 100,
      estRentHighCents:    Math.round(estRent * 1.15) * 100,
      lastSoldPriceCents:  lastSold * 100,
      lastSoldDate:        new Date(Date.now() - daysAgo * 86_400_000),
      avmPriceCents:       avmPrice * 100,
      avmPriceLowCents:    Math.round(avmPrice * 0.90) * 100,
      avmPriceHighCents:   Math.round(avmPrice * 1.10) * 100,
      sourceProvider:      'MockPropertyProvider v1',
      fetchedAt:           new Date(),
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
      const dist   = (seeded(sh + 6, 10, 200)) / 100;

      return {
        addressLine:    `${num} ${street}`,
        soldPriceCents: price * 100,
        compType:       'SALE' as const,
        soldDate:       new Date(Date.now() - days * 86_400_000),
        beds,
        baths:          baths + 0.5 * (sh % 2),
        sqft,
        distanceMiles:  parseFloat(dist.toFixed(2)),
        correlation:    parseFloat(((seeded(sh + 7, 60, 99)) / 100).toFixed(2)),
      };
    });
  }
}

// ─── RentCast Provider ────────────────────────────────────────────────────────

const RENTCAST_BASE = 'https://api.rentcast.io/v1';

const ENDPOINT_TTL_MS: Record<string, number> = {
  'properties':          30 * 24 * 60 * 60 * 1000,  // 30 days
  'avm/value':            7 * 24 * 60 * 60 * 1000,  //  7 days
  'avm/rent/long-term':   7 * 24 * 60 * 60 * 1000,  //  7 days
};

function rentcastCacheKey(address: string, endpoint: string): string {
  const normalized = address.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 80);
  const endpointSlug = endpoint.replace(/\//g, '_');
  return `${normalized}__${endpointSlug}`;
}

interface RentcastResult {
  data:   Record<string, unknown> | null;
  cached: boolean;
  stale:  boolean;
  asOf:   string;
}

async function rentcastFetch(
  endpoint: string,
  address: string,
  apiKey: string,
): Promise<RentcastResult> {
  const key = rentcastCacheKey(address, endpoint);
  const cacheRef = adminDb.collection('rentcastPropertyCache').doc(key);
  const ttl = ENDPOINT_TTL_MS[endpoint] ?? ENDPOINT_TTL_MS['avm/value'];

  // ── Cache read ────────────────────────────────────────────────
  const cachedSnap = await cacheRef.get();
  if (cachedSnap.exists) {
    const d = cachedSnap.data()!;
    const age = Date.now() - (d.fetchedAt?.toMillis?.() ?? 0);
    if (age < ttl) {
      return {
        data:   d.payload as Record<string, unknown>,
        cached: true,
        stale:  false,
        asOf:   d.fetchedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    }
  }

  // ── Live fetch ────────────────────────────────────────────────
  const qs = new URLSearchParams({ address }).toString();
  const url = `${RENTCAST_BASE}/${endpoint}?${qs}`;
  const now = new Date().toISOString();

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
      next: { revalidate: 0 },
    });
  } catch (netErr) {
    logger.warn(`[RentCast] Network error for /${endpoint}`, { endpoint, address });
    if (cachedSnap.exists) {
      const d = cachedSnap.data()!;
      return {
        data:   d.payload as Record<string, unknown>,
        cached: true,
        stale:  true,
        asOf:   d.fetchedAt?.toDate?.()?.toISOString() ?? now,
      };
    }
    throw netErr;
  }

  if (!res.ok) {
    if (res.status === 404) {
      return { data: null, cached: false, stale: false, asOf: now };
    }
    const body = await res.text();
    logger.error(`[RentCast] HTTP ${res.status} for /${endpoint}`, undefined, { endpoint, status: res.status });
    if (cachedSnap.exists) {
      const d = cachedSnap.data()!;
      return {
        data:   d.payload as Record<string, unknown>,
        cached: true,
        stale:  true,
        asOf:   d.fetchedAt?.toDate?.()?.toISOString() ?? now,
      };
    }
    throw new Error(`RentCast /${endpoint} returned HTTP ${res.status}: ${body}`);
  }

  const payload = await res.json() as Record<string, unknown>;
  await cacheRef.set({ payload, fetchedAt: FieldValue.serverTimestamp() });

  return { data: payload, cached: false, stale: false, asOf: now };
}

function toNum(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export class RentCastPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(address: string): Promise<PropertyFacts> {
    const noResult: RentcastResult = { data: null, cached: false, stale: false, asOf: new Date().toISOString() };

    const [propR, avmR, rentR] = await Promise.all([
      rentcastFetch('properties', address, this.apiKey).catch(e => {
        logger.error('[RentCast] /properties failed', e instanceof Error ? e : undefined);
        return noResult;
      }),
      rentcastFetch('avm/value', address, this.apiKey).catch(e => {
        logger.error('[RentCast] /avm/value failed', e instanceof Error ? e : undefined);
        return noResult;
      }),
      rentcastFetch('avm/rent/long-term', address, this.apiKey).catch(e => {
        logger.error('[RentCast] /avm/rent/long-term failed', e instanceof Error ? e : undefined);
        return noResult;
      }),
    ]);

    if (!propR.data && !avmR.data && !rentR.data) {
      return {
        noCoverage:     true,
        sourceProvider: 'rentcast',
        fetchedAt:      new Date(),
        asOf:           new Date().toISOString(),
      };
    }

    const prop = propR.data ?? {};
    const avm  = avmR.data  ?? {};
    const rent = rentR.data ?? {};

    // Tax/assessment
    const assessments = Array.isArray(prop.assessments)
      ? prop.assessments as Record<string, unknown>[]
      : [];
    const latestAssessment = assessments[0] ?? {};

    // Timestamps
    const lastSoldDateRaw = prop.lastSaleDate;
    const lastSoldDate = typeof lastSoldDateRaw === 'string' ? new Date(lastSoldDateRaw) : undefined;

    const allCached = propR.cached && avmR.cached && rentR.cached;
    const anyStale  = propR.stale  || avmR.stale  || rentR.stale;
    const asOf = [propR.asOf, avmR.asOf, rentR.asOf].sort().reverse()[0];

    return {
      beds:                   toNum(prop.bedrooms),
      baths:                  toNum(prop.bathrooms),
      sqft:                   toNum(prop.squareFootage),
      yearBuilt:              toNum(prop.yearBuilt),
      lotSqft:                toNum(prop.lotSize),
      propertyType:           typeof prop.propertyType === 'string' ? prop.propertyType : undefined,
      lastSoldPriceCents:     toNum(prop.lastSalePrice) != null
                                ? Math.round(toNum(prop.lastSalePrice)! * 100) : undefined,
      lastSoldDate,
      avmPriceCents:          toNum(avm.price) != null
                                ? Math.round(toNum(avm.price)! * 100) : undefined,
      avmPriceLowCents:       toNum(avm.priceRangeLow) != null
                                ? Math.round(toNum(avm.priceRangeLow)! * 100) : undefined,
      avmPriceHighCents:      toNum(avm.priceRangeHigh) != null
                                ? Math.round(toNum(avm.priceRangeHigh)! * 100) : undefined,
      estRentCents:           toNum(rent.rent) != null
                                ? Math.round(toNum(rent.rent)! * 100) : undefined,
      estRentLowCents:        toNum(rent.rentRangeLow) != null
                                ? Math.round(toNum(rent.rentRangeLow)! * 100) : undefined,
      estRentHighCents:       toNum(rent.rentRangeHigh) != null
                                ? Math.round(toNum(rent.rentRangeHigh)! * 100) : undefined,
      annualPropertyTaxCents: toNum(prop.tax ?? prop.annualTax) != null
                                ? Math.round(toNum(prop.tax ?? prop.annualTax)! * 100) : undefined,
      taxAssessedValueCents:  toNum(latestAssessment.value) != null
                                ? Math.round(toNum(latestAssessment.value)! * 100) : undefined,
      taxYear:                toNum(latestAssessment.year),
      sourceProvider:         'rentcast',
      fetchedAt:              new Date(),
      asOf,
      cached:                 allCached,
      stale:                  anyStale,
    };
  }

  async getComps(address: string): Promise<Comp[]> {
    const noResult: RentcastResult = { data: null, cached: false, stale: false, asOf: new Date().toISOString() };
    const [avmR, rentR] = await Promise.all([
      rentcastFetch('avm/value', address, this.apiKey).catch(() => noResult),
      rentcastFetch('avm/rent/long-term', address, this.apiKey).catch(() => noResult),
    ]);

    const comps: Comp[] = [];

    // Sale comps from /avm/value
    const rawSale = avmR.data?.comparables;
    if (Array.isArray(rawSale)) {
      for (const c of rawSale as Record<string, unknown>[]) {
        const price = toNum(c.price);
        comps.push({
          addressLine:    String(c.formattedAddress ?? c.addressLine ?? c.address ?? ''),
          soldPriceCents: price != null ? Math.round(price * 100) : undefined,
          compType:       'SALE',
          listedDate:     typeof c.listedDate === 'string' ? new Date(c.listedDate) : undefined,
          soldDate:       typeof c.closedDate === 'string' ? new Date(c.closedDate) :
                          typeof c.soldDate === 'string'   ? new Date(c.soldDate)   : undefined,
          beds:           toNum(c.bedrooms),
          baths:          toNum(c.bathrooms),
          sqft:           toNum(c.squareFootage),
          distanceMiles:  toNum(c.distance),
          correlation:    toNum(c.correlation),
          daysOnMarket:   toNum(c.daysOnMarket),
          status:         typeof c.status === 'string' ? c.status : undefined,
        });
      }
    }

    // Rental comps from /avm/rent/long-term
    const rawRent = rentR.data?.comparables;
    if (Array.isArray(rawRent)) {
      for (const c of rawRent as Record<string, unknown>[]) {
        const rent = toNum(c.rent);
        comps.push({
          addressLine:   String(c.formattedAddress ?? c.addressLine ?? c.address ?? ''),
          rentCents:     rent != null ? Math.round(rent * 100) : undefined,
          compType:      'RENTAL',
          listedDate:    typeof c.listedDate === 'string' ? new Date(c.listedDate) : undefined,
          beds:          toNum(c.bedrooms),
          baths:         toNum(c.bathrooms),
          sqft:          toNum(c.squareFootage),
          distanceMiles: toNum(c.distance),
          correlation:   toNum(c.correlation),
          daysOnMarket:  toNum(c.daysOnMarket),
          status:        typeof c.status === 'string' ? c.status : undefined,
        });
      }
    }

    return comps;
  }
}

// ─── ATTOM / Mashvisor — shells (non-priority) ────────────────────────────────

export class AttomPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async getFacts(a: string): Promise<PropertyFacts> {
    logger.warn('[AttomPropertyProvider] Not fully implemented — falling back to mock');
    const f = await new MockPropertyDataProvider().getFacts(a);
    return { ...f, sourceProvider: 'ATTOM (partial)' };
  }
  async getComps(a: string): Promise<Comp[]> { return new MockPropertyDataProvider().getComps(a); }
}

export class MashvisorPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async getFacts(a: string): Promise<PropertyFacts> {
    logger.warn('[MashvisorPropertyProvider] Not fully implemented — falling back to mock');
    const f = await new MockPropertyDataProvider().getFacts(a);
    return { ...f, sourceProvider: 'Mashvisor (partial)' };
  }
  async getComps(a: string): Promise<Comp[]> { return new MockPropertyDataProvider().getComps(a); }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getPropertyProvider(type?: string): PropertyDataProvider {
  // Default is 'rentcast' — mock is opt-in for keyless/dev environments only.
  const providerType = (type ?? process.env.PROPERTY_DATA_PROVIDER ?? 'rentcast').toLowerCase();

  switch (providerType) {
    case 'rentcast': {
      const key = process.env.RENTCAST_API_KEY;
      if (!key) {
        logger.warn(
          '[PROPERTY PROVIDER] RENTCAST_API_KEY is not set — falling back to mock. ' +
          'Set RENTCAST_API_KEY in your environment. Mock data is never acceptable in production.',
        );
        return new MockPropertyDataProvider();
      }
      return new RentCastPropertyProvider(key);
    }
    case 'attom': {
      const key = process.env.ATTOM_API_KEY;
      if (!key) { logger.warn('[PROPERTY PROVIDER] ATTOM_API_KEY missing — falling back to mock'); return new MockPropertyDataProvider(); }
      return new AttomPropertyProvider(key);
    }
    case 'mashvisor': {
      const key = process.env.MASHVISOR_API_KEY;
      if (!key) { logger.warn('[PROPERTY PROVIDER] MASHVISOR_API_KEY missing — falling back to mock'); return new MockPropertyDataProvider(); }
      return new MashvisorPropertyProvider(key);
    }
    case 'mock':
      return new MockPropertyDataProvider();
    default:
      logger.warn(`[PROPERTY PROVIDER] Unknown provider "${providerType}" — falling back to mock`);
      return new MockPropertyDataProvider();
  }
}
// defaultPropertyProvider singleton removed — it was evaluated once at module load time,
// capturing the env state at build. The route calls getPropertyProvider() per-request instead.
