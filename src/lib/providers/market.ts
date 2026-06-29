// Market Data Provider — abstraction layer for zip-level market statistics.
//
// Candidate integrations:
//   - RentCast  https://developers.rentcast.io          (zip-level market statistics)

import { logger } from '@/lib/logger';
import { getRentCastClient } from './rentcast';

export interface MarketStat {
  averagePrice?: number;
  medianPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  averagePricePerSquareFoot?: number;
  medianPricePerSquareFoot?: number;
  minPricePerSquareFoot?: number;
  maxPricePerSquareFoot?: number;
  averageSquareFootage?: number;
  medianSquareFootage?: number;
  minSquareFootage?: number;
  maxSquareFootage?: number;
  averageDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  minDaysOnMarket?: number;
  maxDaysOnMarket?: number;
  newListings?: number;
  totalListings?: number;
}

export interface MarketPropertyTypeStat extends MarketStat {
  propertyType: string;
}

export interface MarketBedroomsStat extends MarketStat {
  bedrooms: number;
}

export interface MarketDataSection extends MarketStat {
  dataByPropertyType?: MarketPropertyTypeStat[];
  dataByBedrooms?: MarketBedroomsStat[];
  history?: Record<string, MarketStat>;
}

export interface MarketStats {
  zipCode: string;
  city?: string;
  state?: string;
  county?: string;
  saleData?: MarketDataSection;
  rentalData?: MarketDataSection;
  sourceProvider: string;
  fetchedAt: Date;
}

export interface MarketDataProvider {
  getMarketStats(zipCode: string): Promise<MarketStats>;
}

export class MarketStatsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketStatsNotFoundError';
    Object.setPrototypeOf(this, MarketStatsNotFoundError.prototype);
  }
}

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

const PROPERTY_TYPES = ["Single Family", "Condo", "Townhouse", "Multi-Family"];

// ─── Mock Market Provider ─────────────────────────────────────────────────────

export class MockMarketDataProvider implements MarketDataProvider {
  async getMarketStats(zipCode: string): Promise<MarketStats> {
    await new Promise(r => setTimeout(r, 500)); // simulate API latency
    const h = hashCode(zipCode);

    // Simulate "honest unavailable state" for specific zip codes (rural)
    // Deterministically fail if zip starts with '000', '999', or ends with '99'
    if (zipCode.startsWith('000') || zipCode.startsWith('999') || zipCode.endsWith('99')) {
      throw new MarketStatsNotFoundError(
        `No market statistics available for zip code: ${zipCode}`
      );
    }

    const cityIdx = h % 3;
    const cities = ["Austin", "Miami", "Denver"];
    const states = ["TX", "FL", "CO"];
    const counties = ["Travis", "Miami-Dade", "Denver"];

    const city = cities[cityIdx];
    const state = states[cityIdx];
    const county = counties[cityIdx];

    // Top-level stats
    const medianPrice = seeded(h, 250_000, 750_000);
    const medianRent = seeded(h + 1, 1_400, 3_800);
    const medianPricePerSqft = seeded(h + 2, 180, 450);
    const medianRentPerSqft = seeded(h + 3, 1, 3);
    const medianDaysOnMarket = seeded(h + 4, 15, 65);
    const averageDaysOnMarket = medianDaysOnMarket + seeded(h + 5, 2, 10);
    const totalListings = seeded(h + 6, 20, 280);
    const newListings = Math.round(totalListings * 0.25);

    // Breakdowns
    const salePropertyTypeStats: MarketPropertyTypeStat[] = PROPERTY_TYPES.map((pt, i) => {
      const ph = h + i * 13;
      const multiplier = pt === "Single Family" ? 1.2 : pt === "Condo" ? 0.85 : pt === "Townhouse" ? 0.95 : 1.5;
      const med = Math.round(medianPrice * multiplier);
      const medSqft = Math.round(medianPricePerSqft * (pt === "Condo" ? 1.15 : 0.95));
      const dom = seeded(ph, 15, 65);

      return {
        propertyType: pt,
        medianPrice: med,
        averagePrice: Math.round(med * 1.05),
        minPrice: Math.round(med * 0.7),
        maxPrice: Math.round(med * 1.5),
        medianPricePerSquareFoot: medSqft,
        averagePricePerSquareFoot: Math.round(medSqft * 1.02),
        medianDaysOnMarket: dom,
        averageDaysOnMarket: dom + 3,
        totalListings: seeded(ph + 1, 5, 80),
        newListings: seeded(ph + 2, 1, 20),
      };
    });

    const rentPropertyTypeStats: MarketPropertyTypeStat[] = PROPERTY_TYPES.map((pt, i) => {
      const ph = h + i * 27;
      const multiplier = pt === "Single Family" ? 1.15 : pt === "Condo" ? 0.9 : pt === "Townhouse" ? 0.95 : 1.3;
      const med = Math.round(medianRent * multiplier);
      const medSqft = Math.round(medianRentPerSqft * (pt === "Condo" ? 1.2 : 0.95));
      const dom = seeded(ph, 10, 45);

      return {
        propertyType: pt,
        medianPrice: med,
        averagePrice: Math.round(med * 1.05),
        minPrice: Math.round(med * 0.8),
        maxPrice: Math.round(med * 1.4),
        medianPricePerSquareFoot: medSqft,
        averagePricePerSquareFoot: Math.round(medSqft * 1.02),
        medianDaysOnMarket: dom,
        averageDaysOnMarket: dom + 2,
        totalListings: seeded(ph + 1, 5, 60),
        newListings: seeded(ph + 2, 1, 15),
      };
    });

    const saleBedroomsStats: MarketBedroomsStat[] = [1, 2, 3, 4, 5].map((bed, i) => {
      const ph = h + i * 43;
      const multiplier = 0.5 + bed * 0.25;
      const med = Math.round(medianPrice * multiplier);
      const dom = seeded(ph, 15, 65);

      return {
        bedrooms: bed,
        medianPrice: med,
        averagePrice: Math.round(med * 1.04),
        minPrice: Math.round(med * 0.75),
        maxPrice: Math.round(med * 1.45),
        medianDaysOnMarket: dom,
        averageDaysOnMarket: dom + 4,
        totalListings: seeded(ph + 1, 4, 50),
      };
    });

    const rentBedroomsStats: MarketBedroomsStat[] = [1, 2, 3, 4, 5].map((bed, i) => {
      const ph = h + i * 59;
      const multiplier = 0.6 + bed * 0.2;
      const med = Math.round(medianRent * multiplier);
      const dom = seeded(ph, 10, 45);

      return {
        bedrooms: bed,
        medianPrice: med,
        averagePrice: Math.round(med * 1.03),
        minPrice: Math.round(med * 0.8),
        maxPrice: Math.round(med * 1.35),
        medianDaysOnMarket: dom,
        averageDaysOnMarket: dom + 3,
        totalListings: seeded(ph + 1, 4, 40),
      };
    });

    // History (last 12 months)
    const saleHistory: Record<string, MarketStat> = {};
    const rentalHistory: Record<string, MarketStat> = {};

    // Generate chronological monthly keys like 2025-06, 2025-07, etc.
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;

      // Simulate a gentle economic cycle / random walk
      const cycleMultiplier = 1 + 0.04 * Math.sin((h + (11 - i)) * 0.5);

      saleHistory[key] = {
        medianPrice: Math.round(medianPrice * cycleMultiplier),
        averagePrice: Math.round(medianPrice * 1.05 * cycleMultiplier),
        medianPricePerSquareFoot: Math.round(medianPricePerSqft * cycleMultiplier),
        averagePricePerSquareFoot: Math.round(medianPricePerSqft * 1.02 * cycleMultiplier),
        medianDaysOnMarket: Math.round(medianDaysOnMarket * (1 + 0.1 * Math.cos((h + i) * 0.5))),
        averageDaysOnMarket: Math.round(averageDaysOnMarket * (1 + 0.1 * Math.cos((h + i) * 0.5))),
        totalListings: Math.round(totalListings * cycleMultiplier),
      };

      rentalHistory[key] = {
        medianPrice: Math.round(medianRent * cycleMultiplier),
        averagePrice: Math.round(medianRent * 1.04 * cycleMultiplier),
        medianPricePerSquareFoot: Math.round(medianRentPerSqft * cycleMultiplier),
        averagePricePerSquareFoot: Math.round(medianRentPerSqft * 1.02 * cycleMultiplier),
        medianDaysOnMarket: Math.round(seeded(h + i * 2, 10, 45)),
        averageDaysOnMarket: Math.round(seeded(h + i * 2 + 1, 12, 50)),
        totalListings: Math.round(seeded(h + i * 3, 10, 150)),
      };
    }

    return {
      zipCode,
      city,
      state,
      county,
      saleData: {
        medianPrice,
        averagePrice: Math.round(medianPrice * 1.05),
        medianPricePerSquareFoot: medianPricePerSqft,
        averagePricePerSquareFoot: Math.round(medianPricePerSqft * 1.02),
        medianDaysOnMarket,
        averageDaysOnMarket,
        totalListings,
        newListings,
        dataByPropertyType: salePropertyTypeStats,
        dataByBedrooms: saleBedroomsStats,
        history: saleHistory,
      },
      rentalData: {
        medianPrice: medianRent,
        averagePrice: Math.round(medianRent * 1.04),
        medianPricePerSquareFoot: medianRentPerSqft,
        averagePricePerSquareFoot: Math.round(medianRentPerSqft * 1.02),
        medianDaysOnMarket,
        averageDaysOnMarket,
        totalListings,
        newListings,
        dataByPropertyType: rentPropertyTypeStats,
        dataByBedrooms: rentBedroomsStats,
        history: rentalHistory,
      },
      sourceProvider: "MockMarketProvider v1",
      fetchedAt: new Date(),
    };
  }
}

// ─── RentCast Market Provider ─────────────────────────────────────────────────

export class RentCastMarketDataProvider implements MarketDataProvider {
  private client: import('@/lib/providers/rentcast').RentCastClient;

  constructor(client: import('@/lib/providers/rentcast').RentCastClient) {
    this.client = client;
  }

  async getMarketStats(zipCode: string): Promise<MarketStats> {
    try {
      const data = await this.client.getMarketStats({ zipCode });
      
      if (!data) {
        throw new MarketStatsNotFoundError(
          `No market statistics returned for zip code: ${zipCode}`
        );
      }

      // Convert RentCastMarketData to unified MarketStats format
      return {
        zipCode: data.zipCode,
        city: data.city || undefined,
        state: data.state || undefined,
        county: data.county || undefined,
        saleData: data.saleData ? {
          ...data.saleData,
        } : undefined,
        rentalData: data.rentalData ? {
          ...data.rentalData,
        } : undefined,
        sourceProvider: "RentCast API",
        fetchedAt: new Date(),
      };
    } catch (err: any) {
      if (err?.name === 'RentCastNotFoundError' || err?.code === 'not_found' || err instanceof MarketStatsNotFoundError) {
        throw new MarketStatsNotFoundError(`No market statistics available for zip code: ${zipCode}`);
      }
      logger.error(`[RentCastMarketDataProvider] Error fetching zip stats for ${zipCode}:`, err);
      throw err;
    }
  }
}

// ─── Unavailable provider — returned when a real provider is configured but the
// API key is absent. Throws rather than silently serving mock data in prod.
export class UnavailableMarketProvider implements MarketDataProvider {
  constructor(private readonly reason: string) {}
  async getMarketStats(): Promise<MarketStats> { throw new Error(this.reason); }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getMarketProvider(type?: string): MarketDataProvider {
  const providerType = (type || process.env.PROPERTY_DATA_PROVIDER || "mock").toLowerCase();

  switch (providerType) {
    case "rentcast": {
      const client = getRentCastClient();
      if (!client) {
        return new UnavailableMarketProvider(
          'PROPERTY_DATA_PROVIDER=rentcast but RENTCAST_API_KEY is not set. ' +
          'Set the key or change PROPERTY_DATA_PROVIDER to "mock" for local dev.'
        );
      }
      return new RentCastMarketDataProvider(client);
    }
    case "mock":
    default:
      return new MockMarketDataProvider();
  }
}

export const defaultMarketProvider: MarketDataProvider = getMarketProvider();
