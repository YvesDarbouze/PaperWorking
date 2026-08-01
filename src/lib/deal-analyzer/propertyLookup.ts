import { getRentCastClient, isRentCastEnabled } from '@/lib/providers/rentcast/index';

export interface PropertyFacts {
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
}

export interface PropertyProvenance {
  source: string;
  retrievedAt: string; // ISO date string
  confidence?: 'high' | 'medium' | 'low';
}

export interface PropertyLookupResult {
  propertyTaxesAnnual?: number;
  rentEstimate?: number;
  propertyFacts?: PropertyFacts;
  valueEstimate?: number;
  hoaMonthly?: number;
  provenance: PropertyProvenance;
}

export interface PropertyLookupProvider {
  lookup(address: string): Promise<PropertyLookupResult | null>;
}

// ── 5 REALISTIC MOCK FIXTURES ──────────────────────────────────────────────────

export const MOCK_LOOKUP_FIXTURES: Record<string, PropertyLookupResult | 'NOT_FOUND' | 'ERROR'> = {
  // 1. Full Hit
  '123 MAIN ST, AUSTIN, TX 78701': {
    propertyTaxesAnnual: 4800,
    rentEstimate: 2800,
    valueEstimate: 450000,
    hoaMonthly: 150,
    propertyFacts: {
      beds: 3,
      baths: 2,
      sqft: 1850,
      yearBuilt: 2012,
      propertyType: 'Single Family',
    },
    provenance: {
      source: 'RentCast Public Records',
      retrievedAt: '2026-07-30T12:00:00.000Z',
      confidence: 'high',
    },
  },

  // 2. Taxes-Only Hit
  '456 OAK AVE, DALLAS, TX 75201': {
    propertyTaxesAnnual: 3600,
    hoaMonthly: 75,
    propertyFacts: {
      beds: 2,
      baths: 1.5,
      sqft: 1200,
      yearBuilt: 1985,
      propertyType: 'Townhouse',
    },
    provenance: {
      source: 'Dallas County Public Records',
      retrievedAt: '2026-07-30T12:00:00.000Z',
      confidence: 'medium',
    },
  },

  // 3. Rent-Only Hit
  '789 PINE RD, HOUSTON, TX 77002': {
    rentEstimate: 2100,
    propertyFacts: {
      beds: 3,
      baths: 2,
      sqft: 1500,
      yearBuilt: 1998,
      propertyType: 'Single Family',
    },
    provenance: {
      source: 'RentCast AVM',
      retrievedAt: '2026-07-30T12:00:00.000Z',
      confidence: 'medium',
    },
  },

  // 4. Not-Found
  '999 UNKNOWN WAY, NOWHERE, CA 90000': 'NOT_FOUND',

  // 5. Provider-Error
  '500 ERROR BLVD, FAILTOWN, NY 10001': 'ERROR',
};

// ── MOCK PROVIDER ADAPTER ─────────────────────────────────────────────────────

export class MockPropertyLookupProvider implements PropertyLookupProvider {
  async lookup(address: string): Promise<PropertyLookupResult | null> {
    const raw = (address || '').trim().toUpperCase();
    if (!raw) return null;

    // Simulate async network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Check exact fixture matches first
    if (MOCK_LOOKUP_FIXTURES[raw]) {
      const target = MOCK_LOOKUP_FIXTURES[raw];
      if (target === 'ERROR') {
        throw new Error('External property data provider temporary error (500)');
      }
      if (target === 'NOT_FOUND') {
        return null;
      }
      return target as PropertyLookupResult;
    }

    // Partial key matching for flexible search inputs
    if (raw.includes('500 ERROR') || raw.includes('FAILTOWN')) {
      throw new Error('External property data provider temporary error (500)');
    }
    if (raw.includes('999 UNKNOWN') || raw.includes('NOWHERE')) {
      return null;
    }
    if (raw.includes('123 MAIN') || raw.includes('AUSTIN')) {
      return MOCK_LOOKUP_FIXTURES['123 MAIN ST, AUSTIN, TX 78701'] as PropertyLookupResult;
    }
    if (raw.includes('456 OAK') || raw.includes('DALLAS')) {
      return MOCK_LOOKUP_FIXTURES['456 OAK AVE, DALLAS, TX 75201'] as PropertyLookupResult;
    }
    if (raw.includes('789 PINE') || raw.includes('HOUSTON')) {
      return MOCK_LOOKUP_FIXTURES['789 PINE RD, HOUSTON, TX 77002'] as PropertyLookupResult;
    }

    // Default for any unrecognized address: return null (not found)
    return null;
  }
}

// ── REAL RENTCAST PROVIDER ADAPTER ────────────────────────────────────────────

export class RealRentCastPropertyLookupProvider implements PropertyLookupProvider {
  async lookup(address: string): Promise<PropertyLookupResult | null> {
    const client = getRentCastClient();
    if (!client) {
      throw new Error('RentCast client is not available. Check RENTCAST_API_KEY.');
    }

    try {
      const [rentRes, valRes] = await Promise.allSettled([
        client.getRentEstimate({ address }),
        client.getValueEstimate({ address }),
      ]);

      const rent = rentRes.status === 'fulfilled' ? rentRes.value : null;
      const val = valRes.status === 'fulfilled' ? valRes.value : null;

      if (!rent && !val) {
        return null;
      }

      const rentEstimate = rent?.rent || undefined;
      const valueEstimate = val?.price || undefined;

      const subject = val?.subjectProperty || rent?.subjectProperty;
      const propertyFacts: PropertyFacts | undefined = subject
        ? {
            beds: subject.bedrooms || undefined,
            baths: subject.bathrooms || undefined,
            sqft: subject.squareFootage || undefined,
            yearBuilt: subject.yearBuilt || undefined,
            propertyType: subject.propertyType || undefined,
          }
        : undefined;

      return {
        rentEstimate,
        valueEstimate,
        propertyFacts,
        provenance: {
          source: 'RentCast API',
          retrievedAt: new Date().toISOString(),
          confidence: rent && val ? 'high' : 'medium',
        },
      };
    } catch (err: any) {
      console.error('[RealRentCastPropertyLookupProvider] Lookup failed:', err.message || err);
      throw err;
    }
  }
}

// ── PROVIDER FACTORY ──────────────────────────────────────────────────────────

export function getPropertyLookupProvider(forceMock?: boolean): PropertyLookupProvider {
  if (forceMock) {
    return new MockPropertyLookupProvider();
  }
  const providerType = (process.env.PROPERTY_DATA_PROVIDER || 'mock').toLowerCase();
  if (providerType === 'rentcast' && isRentCastEnabled()) {
    return new RealRentCastPropertyLookupProvider();
  }
  return new MockPropertyLookupProvider();
}
