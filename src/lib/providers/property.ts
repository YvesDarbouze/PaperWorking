// ─── Authoritative store names ────────────────────────────────────────────────
// Firestore: "projects" collection, doc per project (fields under financials.*)
// Prisma: ReilPropertyFacts table, ReilValuationSnapshot table
// Valuation history subcollection: written via appendValuationSnapshot() in @/lib/db/projects

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
  photoUrl?:              string;
  beds?:                  number;
  baths?:                 number;
  sqft?:                  number;
  yearBuilt?:             number;
  lotSqft?:               number;
  propertyType?:          string;
  listPriceCents?:        number;
  estRentCents?:          number;
  lastSoldPriceCents?:    number;
  lastSoldDate?:          Date;
  // ─── Tax & HOA (Prompt 2) ───────────────────────────────────────────────
  annualPropertyTaxCents?:  number;  // Most recent annual property tax (cents)
  taxAssessedValueCents?:   number;  // Most recent assessed value (cents)
  taxAssessedLandValCents?: number;  // Assessed land value (cents)
  taxAssessedImprovementsValCents?: number; // Assessed improvements value (cents)
  taxYear?:                 number;  // Year of the tax/assessment figure
  hoaMonthlyCents?:         number;  // Monthly HOA fee (cents), if any
  taxSource?:               string;  // e.g. 'rentcast' — so UI can label provenance
  // ─── Rent AVM (Prompt 3) ────────────────────────────────────────────────
  estRentLowCents?:         number;  // Rent estimate low bound
  estRentHighCents?:        number;  // Rent estimate high bound
  // ─── Value AVM (Prompt 4) ───────────────────────────────────────────────
  avmPriceCents?:           number;  // AVM value estimate
  avmPriceLowCents?:        number;  // AVM value estimate low bound
  avmPriceHighCents?:       number;  // AVM value estimate high bound
  // ─── Multi-family ────────────────────────────────────────────────────────
  units?:                   number;  // Total unit count (multi-family only). estRentCents is per-unit.
  totalBuildingRentCents?:  number;  // estRentCents × units (multi-family only). Absent for SFR.
  // ─── Meta ───────────────────────────────────────────────────────────────
  sourceProvider:           string;
  fetchedAt:                Date;
}

export interface Comp {
  addressLine:    string;
  soldPriceCents?: number | null; // Keep optional for rental compatibility
  soldDate?:       Date | null;    // Keep optional for rental compatibility
  beds?:          number;
  baths?:         number;
  sqft?:          number;
  distanceMiles?: number;
  // Enriched comp fields (Prompt 4)
  compType?:      string;
  priceCents?:    number;
  correlation?:   number;
  daysOnMarket?:  number;
  status?:        string;
  listedDate?:    Date;
}

export interface RentalComp {
  addressLine:    string;
  rentPriceCents: number;
  distanceMiles?: number;
  daysOnMarket?:  number;
  correlation?:   number;
  status?:        string;
  beds?:          number;
  baths?:         number;
  sqft?:          number;
  listedDate?:    Date;
}

export interface ValueEstimate {
  priceCents:     number;
  priceLowCents:  number;
  priceHighCents: number;
  source:         string;
  fetchedAt:      Date;
}

export interface PropertyDataProvider {
  getFacts(addressOrPlaceId: string): Promise<PropertyFacts>;
  getComps(addressOrPlaceId: string): Promise<Comp[]>;
  getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]>;
  getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate>;
}

export class PropertyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PropertyNotFoundError';
    Object.setPrototypeOf(this, PropertyNotFoundError.prototype);
  }
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
    const propType   = PROPERTY_TYPES[typeIdx];
    const listPrice  = seeded(h + 5,   250_000, 1_200_000);
    const estRent    = seeded(h + 6,   1_200, 4_500);
    const lastSold   = seeded(h + 7,   180_000, 950_000);
    const daysAgo    = seeded(h + 8,   30, 730);
    const photoIdx   = h % UNSPLASH_HOUSES.length;

    // Multi-family: populate unit count so callers can distinguish per-unit vs building rent
    const unitCount: number | undefined =
      propType === 'Multi-Family' ? seeded(h + 10, 4, 8) :
      propType === 'Duplex'       ? 2                    :
      undefined;

    const landRatio = 0.15 + (h % 15) / 100; // 15% - 29% land allocation
    const landValCents = Math.round(listPrice * 0.85 * landRatio) * 100;
    const impValCents = Math.round(listPrice * 0.85) * 100 - landValCents;

    return {
      photoUrl:           UNSPLASH_HOUSES[photoIdx],
      beds,
      baths:              baths + 0.5 * (h % 2),
      sqft,
      yearBuilt,
      lotSqft,
      propertyType:       propType,
      units:              unitCount,
      listPriceCents:     listPrice * 100,
      estRentCents:       estRent * 100,
      totalBuildingRentCents: unitCount ? estRent * 100 * unitCount : undefined,
      lastSoldPriceCents: lastSold * 100,
      lastSoldDate:       new Date(Date.now() - daysAgo * 86_400_000),
      annualPropertyTaxCents: Math.round(listPrice * 0.015) * 100,
      taxAssessedValueCents:  Math.round(listPrice * 0.85) * 100,
      taxAssessedLandValCents: landValCents,
      taxAssessedImprovementsValCents: impValCents,
      taxYear:            new Date().getFullYear() - 1,
      hoaMonthlyCents:    (h % 3 === 0) ? seeded(h + 9, 50, 350) * 100 : undefined,
      taxSource:          'mock',
      estRentLowCents:    Math.round(estRent * 0.85) * 100,
      estRentHighCents:   Math.round(estRent * 1.15) * 100,
      avmPriceCents:      listPrice * 100,
      avmPriceLowCents:   Math.round(listPrice * 0.85) * 100,
      avmPriceHighCents:  Math.round(listPrice * 1.15) * 100,
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
      const corr   = (seeded(sh + 7, 75, 99)) / 100;

      return {
        addressLine:    `${num} ${street}`,
        soldPriceCents: price * 100,
        soldDate:       new Date(Date.now() - days * 86_400_000),
        beds,
        baths:          baths + 0.5 * (sh % 2),
        sqft,
        distanceMiles:  parseFloat(dist.toFixed(2)),
        compType:       "SALE",
        priceCents:     price * 100,
        correlation:    corr,
        daysOnMarket:   days,
        status:         "Sold",
        listedDate:     new Date(Date.now() - days * 86_400_000),
      };
    });
  }

  async getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]> {
    await new Promise(r => setTimeout(r, 400));
    const h = hashCode(addressOrPlaceId);

    return Array.from({ length: 6 }, (_, i) => {
      const sh = h + i * 239;
      const num    = seeded(sh,     100, 4_999);
      const street = COMP_STREETS[(sh) % COMP_STREETS.length];
      const rent   = seeded(sh + 1, 1_200, 4_500);
      const days   = seeded(sh + 2, 5, 120);
      const beds   = seeded(sh + 3, 2, 5);
      const baths  = seeded(sh + 4, 1, 4);
      const sqft   = seeded(sh + 5, 850, 3_000);
      const dist   = (seeded(sh + 6, 10, 200)) / 100;
      const corr   = (seeded(sh + 7, 75, 99)) / 100;

      return {
        addressLine:    `${num} ${street}`,
        rentPriceCents: rent * 100,
        distanceMiles:  parseFloat(dist.toFixed(2)),
        daysOnMarket:   days,
        correlation:    corr,
        status:         "Rented",
        beds,
        baths:          baths + 0.5 * (sh % 2),
        sqft,
        listedDate:     new Date(Date.now() - days * 86_400_000),
      };
    });
  }

  async getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate> {
    await new Promise(r => setTimeout(r, 300));
    const h = hashCode(addressOrPlaceId);
    const price = seeded(h, 250_000, 1_200_000);
    return {
      priceCents: price * 100,
      priceLowCents: Math.round(price * 0.85) * 100,
      priceHighCents: Math.round(price * 1.15) * 100,
      source: "mock",
      fetchedAt: new Date(),
    };
  }
}

export class RentCastPropertyProvider implements PropertyDataProvider {
  private client: import('@/lib/providers/rentcast').RentCastClient;

  constructor(client: import('@/lib/providers/rentcast').RentCastClient) {
    this.client = client;
  }

  private async getRentEstimateWithWidening(address: string, maxRadius = 5, daysOld = 180): Promise<any> {
    const { logger } = require('@/lib/logger');
    try {
      return await this.client.getRentEstimate({ address, maxRadius, daysOld });
    } catch (err) {
      const isCompError = err instanceof Error && (
        err.message.toLowerCase().includes('comp') ||
        err.message.toLowerCase().includes('insufficient') ||
        err.message.toLowerCase().includes('comparables')
      );
      if (isCompError) {
        if (maxRadius === 5 && daysOld === 180) {
          logger.warn(`[RentCast Property Provider] Not enough comps at 5mi/180d, retrying at 10mi/365d...`);
          return this.getRentEstimateWithWidening(address, 10, 365);
        } else if (maxRadius === 10 && daysOld === 365) {
          logger.warn(`[RentCast Property Provider] Not enough comps at 10mi/365d, retrying at 15mi/730d...`);
          return this.getRentEstimateWithWidening(address, 15, 730);
        }
      }
      throw err;
    }
  }

  private async getValueEstimateWithWidening(address: string, maxRadius = 5, daysOld = 180): Promise<any> {
    const { logger } = require('@/lib/logger');
    try {
      return await this.client.getValueEstimate({ address, maxRadius, daysOld });
    } catch (err) {
      const isCompError = err instanceof Error && (
        err.message.toLowerCase().includes('comp') ||
        err.message.toLowerCase().includes('insufficient') ||
        err.message.toLowerCase().includes('comparables')
      );
      if (isCompError) {
        if (maxRadius === 5 && daysOld === 180) {
          logger.warn(`[RentCast Property Provider] Not enough comps at 5mi/180d, retrying at 10mi/365d...`);
          return this.getValueEstimateWithWidening(address, 10, 365);
        } else if (maxRadius === 10 && daysOld === 365) {
          logger.warn(`[RentCast Property Provider] Not enough comps at 10mi/365d, retrying at 15mi/730d...`);
          return this.getValueEstimateWithWidening(address, 15, 730);
        }
      }
      throw err;
    }
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    try {
      // Fire /properties, getRentEstimate, and getValueEstimate in parallel
      const [propResult, rentResult, valueResult] = await Promise.allSettled([
        this.client.getProperties({ address: addressOrPlaceId }),
        this.getRentEstimateWithWidening(addressOrPlaceId),
        this.getValueEstimateWithWidening(addressOrPlaceId),
      ]);

      const properties = propResult.status === 'fulfilled' ? propResult.value : null;
      const rentData   = rentResult.status === 'fulfilled' ? rentResult.value : null;
      const valueData  = valueResult.status === 'fulfilled' ? valueResult.value : null;

      const subject = (properties && properties.length > 0) ? properties[0] : null;

      if (!subject) {
        throw new PropertyNotFoundError(`No property record found for: ${addressOrPlaceId}`);
      }

      // ── Extract last sale from history ──────────────────────────────────────
      let lastSoldPrice: number | undefined;
      let lastSoldDate: Date | undefined;
      if (subject.history && typeof subject.history === 'object') {
        const saleEntries = Object.values(subject.history)
          .filter((h) => h.event === 'Sale' && h.price)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (saleEntries.length > 0) {
          lastSoldPrice = saleEntries[0].price;
          lastSoldDate = new Date(saleEntries[0].date);
        }
      }
      if (!lastSoldDate && subject.lastSaleDate) {
        lastSoldDate = new Date(subject.lastSaleDate);
      }

      // ── Extract most recent tax assessment & property tax ───────────────────
      let annualPropertyTaxCents: number | undefined;
      let taxAssessedValueCents: number | undefined;
      let taxAssessedLandValCents: number | undefined;
      let taxAssessedImprovementsValCents: number | undefined;
      let taxYear: number | undefined;

      if (subject.propertyTaxes && typeof subject.propertyTaxes === 'object') {
        const taxEntries = Object.values(subject.propertyTaxes)
          .sort((a: any, b: any) => b.year - a.year);
        if (taxEntries.length > 0) {
          const latestTax = taxEntries[0] as any;
          annualPropertyTaxCents = Math.round(latestTax.total * 100);
          taxYear = latestTax.year;
        }
      }

      if (subject.taxAssessments && typeof subject.taxAssessments === 'object') {
        const assessEntries = Object.values(subject.taxAssessments)
          .sort((a: any, b: any) => b.year - a.year);
        if (assessEntries.length > 0) {
          const latestAssess = assessEntries[0] as any;
          taxAssessedValueCents = Math.round(latestAssess.value * 100);
          if (latestAssess.land !== undefined && latestAssess.land !== null) {
            taxAssessedLandValCents = Math.round(latestAssess.land * 100);
          }
          if (latestAssess.improvements !== undefined && latestAssess.improvements !== null) {
            taxAssessedImprovementsValCents = Math.round(latestAssess.improvements * 100);
          }
          if (!taxYear) taxYear = latestAssess.year;
        }
      }

      // ── HOA ────────────────────────────────────────────────────────────────
      const hoaMonthlyCents = subject.hoa?.fee
        ? Math.round(subject.hoa.fee * 100)
        : undefined;

      // For multi-family, estRentCents is per-unit (RentCast lookupSubjectAttributes=true default).
      const unitCount: number | undefined = (subject.units ?? 0) > 1 ? subject.units : undefined;
      const estRentPerUnit = rentData?.rent ? Math.round(rentData.rent * 100) : undefined;
      const totalBuildingRentCents = (estRentPerUnit && unitCount) ? estRentPerUnit * unitCount : undefined;

      return {
        photoUrl: undefined,
        beds:               subject.bedrooms  || undefined,
        baths:              subject.bathrooms || undefined,
        sqft:               subject.squareFootage || undefined,
        yearBuilt:          subject.yearBuilt || undefined,
        lotSqft:            subject.lotSize   || undefined,
        propertyType:       subject.propertyType || undefined,
        units:              unitCount,
        totalBuildingRentCents,
        listPriceCents:     undefined,
        estRentCents:       estRentPerUnit,
        lastSoldPriceCents: lastSoldPrice ? Math.round(lastSoldPrice * 100) : undefined,
        lastSoldDate,
        annualPropertyTaxCents,
        taxAssessedValueCents,
        taxAssessedLandValCents,
        taxAssessedImprovementsValCents,
        taxYear,
        hoaMonthlyCents,
        taxSource:          'rentcast',
        estRentLowCents:    rentData?.rentRangeLow ? Math.round(rentData.rentRangeLow * 100) : undefined,
        estRentHighCents:   rentData?.rentRangeHigh ? Math.round(rentData.rentRangeHigh * 100) : undefined,
        avmPriceCents:      valueData?.price ? Math.round(valueData.price * 100) : undefined,
        avmPriceLowCents:   valueData?.priceRangeLow ? Math.round(valueData.priceRangeLow * 100) : undefined,
        avmPriceHighCents:  valueData?.priceRangeHigh ? Math.round(valueData.priceRangeHigh * 100) : undefined,
        sourceProvider:     'RentCast API',
        fetchedAt:          new Date(),
      };
    } catch (err: any) {
      if (err?.name === 'RentCastNotFoundError' || err?.code === 'not_found' || err instanceof PropertyNotFoundError) {
        throw new PropertyNotFoundError(`No property record found for: ${addressOrPlaceId}`);
      }
      throw err;
    }
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    try {
      const valueData = await this.getValueEstimateWithWidening(addressOrPlaceId);
      if (!valueData) return [];
      const comparables = valueData.comparables || [];

      return comparables.map((c: any) => ({
        addressLine:    c.formattedAddress || 'Unknown Address',
        soldPriceCents: c.price ? Math.round(c.price * 100) : null,
        soldDate:       c.listedDate ? new Date(c.listedDate) : null,
        beds:           c.bedrooms  || undefined,
        baths:          c.bathrooms || undefined,
        sqft:           c.squareFootage || undefined,
        distanceMiles:  c.distance,
        compType:       "SALE",
        priceCents:     c.price ? Math.round(c.price * 100) : undefined,
        correlation:    c.correlation,
        daysOnMarket:   c.daysOnMarket || undefined,
        status:         c.status || 'Sold',
        listedDate:     c.listedDate ? new Date(c.listedDate) : undefined,
      }));
    } catch {
      return [];
    }
  }

  async getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]> {
    try {
      const rentData = await this.getRentEstimateWithWidening(addressOrPlaceId);
      if (!rentData) return [];
      const comparables = rentData.comparables || [];

      return comparables.map((c: any) => ({
        addressLine:    c.formattedAddress || 'Unknown Address',
        rentPriceCents: c.price ? Math.round(c.price * 100) : 0,
        distanceMiles:  c.distance,
        daysOnMarket:   c.daysOnMarket || undefined,
        correlation:    c.correlation,
        status:         c.status || 'Rented',
        beds:           c.bedrooms || undefined,
        baths:          c.bathrooms || undefined,
        sqft:           c.squareFootage || undefined,
        listedDate:     c.listedDate ? new Date(c.listedDate) : undefined,
      }));
    } catch {
      return [];
    }
  }

  async getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate> {
    try {
      const valueData = await this.getValueEstimateWithWidening(addressOrPlaceId);
      if (!valueData) {
        throw new PropertyNotFoundError(`Could not generate value estimate for: ${addressOrPlaceId}`);
      }
      return {
        priceCents:     Math.round(valueData.price * 100),
        priceLowCents:  Math.round(valueData.priceRangeLow * 100),
        priceHighCents: Math.round(valueData.priceRangeHigh * 100),
        source:         'rentcast',
        fetchedAt:      new Date(),
      };
    } catch (err: any) {
      if (err?.name === 'RentCastNotFoundError' || err?.code === 'not_found' || err instanceof PropertyNotFoundError) {
        throw new PropertyNotFoundError(`Could not generate value estimate for: ${addressOrPlaceId}`);
      }
      throw err;
    }
  }
}

export class AttomPropertyProvider implements PropertyDataProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFacts(addressOrPlaceId: string): Promise<PropertyFacts> {
    console.log(`📡 [ATTOM] Fetching facts for: ${addressOrPlaceId}`);
    const mock = new MockPropertyDataProvider();
    const facts = await mock.getFacts(addressOrPlaceId);
    facts.sourceProvider = "ATTOM Property API (Skeleton)";
    return facts;
  }

  async getComps(addressOrPlaceId: string): Promise<Comp[]> {
    console.log(`📡 [ATTOM] Fetching comps for: ${addressOrPlaceId}`);
    const mock = new MockPropertyDataProvider();
    const comps = await mock.getComps(addressOrPlaceId);
    return comps.map(c => ({
      ...c,
      addressLine: `${c.addressLine} (ATTOM Comp)`,
    }));
  }

  async getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]> {
    const mock = new MockPropertyDataProvider();
    return mock.getRentalComps(addressOrPlaceId);
  }

  async getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate> {
    const mock = new MockPropertyDataProvider();
    return mock.getValueEstimate(addressOrPlaceId);
  }
}

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

  async getRentalComps(addressOrPlaceId: string): Promise<RentalComp[]> {
    const mock = new MockPropertyDataProvider();
    return mock.getRentalComps(addressOrPlaceId);
  }

  async getValueEstimate(addressOrPlaceId: string): Promise<ValueEstimate> {
    const mock = new MockPropertyDataProvider();
    return mock.getValueEstimate(addressOrPlaceId);
  }
}

// ─── Unavailable provider — returned when a real provider is configured but the
// API key is absent. Throws rather than silently falling back to mock data,
// preventing prod deployments from serving fake data undetected.
export class UnavailablePropertyProvider implements PropertyDataProvider {
  constructor(private readonly reason: string) {}
  async getFacts(): Promise<PropertyFacts> { throw new Error(this.reason); }
  async getComps(): Promise<Comp[]> { throw new Error(this.reason); }
  async getRentalComps(): Promise<RentalComp[]> { throw new Error(this.reason); }
  async getValueEstimate(): Promise<ValueEstimate> { throw new Error(this.reason); }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getPropertyProvider(type?: string): PropertyDataProvider {
  const providerType = (type || process.env.PROPERTY_DATA_PROVIDER || "mock").toLowerCase();

  switch (providerType) {
    case "rentcast": {
      const { getRentCastClient } = require('@/lib/providers/rentcast');
      const client = getRentCastClient();
      if (!client) {
        return new UnavailablePropertyProvider(
          'PROPERTY_DATA_PROVIDER=rentcast but RENTCAST_API_KEY is not set. ' +
          'Set the key or change PROPERTY_DATA_PROVIDER to "mock" for local dev.'
        );
      }
      return new RentCastPropertyProvider(client);
    }
    case "attom": {
      const key = process.env.ATTOM_API_KEY;
      if (!key) {
        return new UnavailablePropertyProvider(
          'PROPERTY_DATA_PROVIDER=attom but ATTOM_API_KEY is not set.'
        );
      }
      return new AttomPropertyProvider(key);
    }
    case "mashvisor": {
      const key = process.env.MASHVISOR_API_KEY;
      if (!key) {
        return new UnavailablePropertyProvider(
          'PROPERTY_DATA_PROVIDER=mashvisor but MASHVISOR_API_KEY is not set.'
        );
      }
      return new MashvisorPropertyProvider(key);
    }
    case "mock":
    default:
      return new MockPropertyDataProvider();
  }
}

export const defaultPropertyProvider: PropertyDataProvider = getPropertyProvider();
