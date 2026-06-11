
export interface RentListing {
  id: string;
  formattedAddress: string;
  price: number;
  status: string;
  listedDate: string;
  removedDate: string | null;
  daysOnMarket: number | null;
}

export interface RentHistoryProvider {
  getRentalHistory(address: string): Promise<RentListing[]>;
}

// ─── Deterministic Hashing Helpers ──────────────────────────────────────────
function getAddressHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getSeededValue(seed: number, min: number, max: number): number {
  const s = ((seed * 1664525 + 1013904223) >>> 0);
  return min + (s % (max - min + 1));
}

// ─── Mock Adapter ────────────────────────────────────────────────────────────
export class MockRentHistoryAdapter implements RentHistoryProvider {
  async getRentalHistory(address: string): Promise<RentListing[]> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));

    const h = getAddressHash(address);
    const basePrice = getSeededValue(h, 1500, 3200);

    // Create 2 historical/active listings deterministically based on address hash
    const listings: RentListing[] = [];

    // 1. Historical listing (inactive)
    const price1 = basePrice - 150;
    const listedDate1 = new Date();
    listedDate1.setFullYear(listedDate1.getFullYear() - 2); // 2 years ago
    const removedDate1 = new Date();
    removedDate1.setFullYear(removedDate1.getFullYear() - 1); // 1 year ago

    listings.push({
      id: `mock-listing-1-${h}`,
      formattedAddress: address,
      price: price1,
      status: 'Inactive',
      listedDate: listedDate1.toISOString(),
      removedDate: removedDate1.toISOString(),
      daysOnMarket: 365,
    });

    // 2. Current/Recent listing (Active)
    const price2 = basePrice;
    const listedDate2 = new Date();
    listedDate2.setMonth(listedDate2.getMonth() - 6); // 6 months ago

    listings.push({
      id: `mock-listing-2-${h}`,
      formattedAddress: address,
      price: price2,
      status: 'Active',
      listedDate: listedDate2.toISOString(),
      removedDate: null,
      daysOnMarket: 180,
    });

    return listings;
  }
}

// ─── RentCast API Adapter ─────────────────────────────────────────────────────
export class RentCastRentHistoryAdapter implements RentHistoryProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getRentalHistory(address: string): Promise<RentListing[]> {
    console.log(`📡 [RentCast API] Fetching rental listings for address: ${address}`);
    
    const url = `https://api.rentcast.io/v1/listings/rental/long-term?address=${encodeURIComponent(address)}&limit=10`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[RentCast API Error] Status ${response.status}: ${errText}`);
        throw new Error(`RentCast API responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id || `rentcast-${item.latitude}-${item.longitude}`,
        formattedAddress: item.formattedAddress || address,
        price: Number(item.price) || 0,
        status: item.status || 'Active',
        listedDate: item.listedDate || new Date().toISOString(),
        removedDate: item.removedDate || null,
        daysOnMarket: item.daysOnMarket !== undefined ? Number(item.daysOnMarket) : null,
      }));
    } catch (error) {
      console.error('[RentCast API Connection Error]', error);
      throw error;
    }
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────
export function getRentHistoryProvider(type?: string): RentHistoryProvider {
  const providerType = (type || process.env.RENTHISTORY_PROVIDER || 'mock').toLowerCase();

  if (providerType === 'rentcast') {
    const apiKey = process.env.RENTCAST_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ [RENT HISTORY PROVIDER] RENTCAST_API_KEY is missing. Falling back to MockRentHistoryAdapter.');
      return new MockRentHistoryAdapter();
    }
    return new RentCastRentHistoryAdapter(apiKey);
  }

  return new MockRentHistoryAdapter();
}

export const defaultRentHistoryProvider = getRentHistoryProvider();
