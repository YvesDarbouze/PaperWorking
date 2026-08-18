import type { SubscriberDealMatch } from '@/types/listing';

// Mock Firestore & Auth
const mockDocGet = jest.fn();
const mockCollectionGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminDb: {
    collection: jest.fn().mockImplementation((collectionName: string) => {
      return {
        where: jest.fn().mockReturnThis(),
        get: mockCollectionGet,
        doc: jest.fn().mockImplementation((docId: string) => {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: docId,
              data: () => {
                if (collectionName === 'properties') {
                  return {
                    id: docId,
                    placeId: `place_${docId.split('_')[1] || docId}`,
                    canonicalAddress: '123 Test St',
                    city: 'City',
                    state: 'ST',
                    zip: '12345',
                    coordinates: { lat: 39.7817, lng: -89.6501 }
                  };
                }
                // If it is 'projects', return from our custom resolver mock
                return mockDocGet(docId);
              }
            })
          };
        })
      };
    })
  },
  adminAuth: { verifyIdToken: jest.fn() },
}));

const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

jest.mock('@/lib/places/placesGateway', () => ({
  __esModule: true,
  geocode: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/metrics/reiMetrics', () => ({
  __esModule: true,
  deriveAllProjectMetrics: jest.fn().mockImplementation((project: any) => {
    if (project.id === 'p_A') return { cashOnCashReturn: 0.05 };
    if (project.id === 'p_B') return { cashOnCashReturn: 0.10 };
    if (project.id === 'p_C') return { cashOnCashReturn: 0.15 };
    return { cashOnCashReturn: 0 };
  }),
}));

jest.mock('@/lib/telemetry', () => {
  const mock = { capture: jest.fn() };
  return {
    __esModule: true,
    telemetry: mock,
    default: mock,
  };
});

let computeRelevanceScore: any;
let searchDealsAuthenticated: any;

beforeAll(() => {
  const mod = require('@/actions/listings');
  computeRelevanceScore = require('@/lib/listings/relevance').computeRelevanceScore;
  searchDealsAuthenticated = mod.searchDealsAuthenticated;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Setup cookie mocks for active subscriber
  mockCookieGet.mockImplementation((name: string) => {
    if (name === 'mock_user_role') return { value: 'Investor' };
    if (name === 'mock_user_account_type') return { value: 'investor' };
    if (name === 'mock_user_subscription_plan') return { value: 'Team' };
    if (name === 'mock_user_subscription_status') return { value: 'active' };
    if (name === 'mock_user_org_id') return { value: 'org_test' };
    return undefined;
  });
});

describe('computeRelevanceScore — DM-12 Formula Verification', () => {
  const mockBaseListing: any = {
    id: 'listing_base',
    projectId: 'p_base',
    organizationId: 'org_test',
    ownerUid: 'u_lead',
    status: 'published',
    visibilityMode: 'MARKETPLACE',
    transitionLog: [],
    propertyName: 'Base Property',
    address: '123 Base St',
    neighborhood: 'Base',
    city: 'BaseCity',
    state: 'BS',
    zipCode: '12345',
    assetClass: 'Residential',
    subStrategy: 'LONG_TERM',
    capitalPlan: 'raise interest',
    askingPriceCents: 10000000,
    followCount: 0,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    leadInvestor: { uid: 'u_lead', displayName: 'Lead' }
  };

  const mockBaseProject: any = {
    id: 'p_base',
    propertyName: 'Base Project',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'acquisition',
    address: '123 Base St',
  };

  const mockBaseMetrics: any = {
    irr: 0,
    roi: 0,
    noi: 0,
    capRate: null,
    cashOnCashReturn: null,
  };

  it('calculates relevance correctly based on weights (40% freshness, 35% yield, 25% activity)', () => {
    // Test 1: Brand new deal (age = 0, freshnessScore = 1.0), 0 yield (yieldScore = 0), 0 follows (activityScore = 0)
    // Expected: 0.40 * 1.0 = 0.40
    const match1: SubscriberDealMatch = {
      listing: { ...mockBaseListing },
      project: mockBaseProject,
      metrics: mockBaseMetrics,
    } as any;
    expect(computeRelevanceScore(match1)).toBeCloseTo(0.40, 4);

    // Test 2: Brand new deal with 15% cash-on-cash yield (yieldScore = 1.0) and 0 follows
    // Expected: (0.40 * 1.0) + (0.35 * 1.0) = 0.75
    const match2: SubscriberDealMatch = {
      listing: { ...mockBaseListing },
      project: mockBaseProject,
      metrics: { ...mockBaseMetrics, cashOnCashReturn: 0.15 },
    } as any;
    expect(computeRelevanceScore(match2)).toBeCloseTo(0.75, 4);

    // Test 3: Brand new deal with 15% yield and 10 follows (activityScore = 1.0)
    // Expected: (0.40 * 1.0) + (0.35 * 1.0) + (0.25 * 1.0) = 1.00
    const match3: SubscriberDealMatch = {
      listing: { ...mockBaseListing, followCount: 10 },
      project: mockBaseProject,
      metrics: { ...mockBaseMetrics, cashOnCashReturn: 0.15 },
    } as any;
    expect(computeRelevanceScore(match3)).toBeCloseTo(1.00, 4);

    // Test 4: Deal updated 15 days ago (freshnessScore = 0.5), 7.5% yield (yieldScore = 0.5), 5 follows (activityScore = 0.5)
    // Expected: (0.40 * 0.5) + (0.35 * 0.5) + (0.25 * 0.5) = 0.50
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const match4: SubscriberDealMatch = {
      listing: { ...mockBaseListing, updatedAt: fifteenDaysAgo, followCount: 5 },
      project: mockBaseProject,
      metrics: { ...mockBaseMetrics, cashOnCashReturn: 0.075 },
    } as any;
    expect(computeRelevanceScore(match4)).toBeCloseTo(0.50, 4);
  });
});

describe('searchDealsAuthenticated — DM-12 Sort Options', () => {
  const createMockMatch = (id: string, ageDays: number, coc: number, follows: number, price: number) => {
    const updatedAt = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString();
    return {
      listing: {
        id: `l_${id}`,
        projectId: `p_${id}`,
        propertyName: `Property ${id}`,
        address: `Address ${id}`,
        city: 'City',
        state: 'ST',
        zipCode: '12345',
        askingPriceCents: price * 100,
        followCount: follows,
        updatedAt,
        createdAt: updatedAt,
        status: 'published',
        visibilityMode: 'MARKETPLACE',
      },
      project: {
        id: `p_${id}`,
        propertyName: `Property ${id}`,
        placeId: `place_${id}`,
        propertyId: `prop_${id}`,
        address: `Address ${id}`,
      },
      metrics: {
        cashOnCashReturn: coc,
      },
    };
  };

  it('orders identical deals differing in exactly one input as documented', async () => {
    const matchA = createMockMatch('A', 0, 0.05, 0, 500000);  // Newest, yield = 5%
    const matchB = createMockMatch('B', 10, 0.10, 0, 400000); // 10 days old, yield = 10%
    const matchC = createMockMatch('C', 20, 0.15, 5, 300000); // 20 days old, yield = 15%, 5 follows

    // Mocks return docs for listings matching query
    mockCollectionGet.mockResolvedValue({
      docs: [
        { id: 'l_A', data: () => matchA.listing },
        { id: 'l_B', data: () => matchB.listing },
        { id: 'l_C', data: () => matchC.listing },
      ]
    });

    // Mock individual project doc loading
    mockDocGet.mockImplementation((id: string) => {
      if (id === 'p_A') return matchA.project;
      if (id === 'p_B') return matchB.project;
      if (id === 'p_C') return matchC.project;
      return null;
    });

    // 1. Test Relevance sort
    // Scores:
    // A: 0.40 * 1.0 + 0.35 * (0.05 / 0.15 = 0.333) + 0 = 0.4 + 0.1166 = 0.5166
    // B: 0.40 * (20/30 = 0.667) + 0.35 * (0.10 / 0.15 = 0.667) + 0 = 0.2667 + 0.2333 = 0.5000
    // C: 0.40 * (10/30 = 0.333) + 0.35 * (0.15 / 0.15 = 1.0) + 0.25 * 0.5 = 0.1333 + 0.35 + 0.125 = 0.6083
    // Order: C, A, B
    const resultRel = await searchDealsAuthenticated('mock_token', 'Address', undefined, 'relevance');
    expect(resultRel.mode).toBe('results');
    if (resultRel.mode === 'results' && resultRel.results) {
      expect(resultRel.results).toHaveLength(3);
      expect(resultRel.results[0].placeId).toBe('place_C');
      expect(resultRel.results[1].placeId).toBe('place_A');
      expect(resultRel.results[2].placeId).toBe('place_B');
    }

    // 2. Test Yield sort
    // Expected order: C (15%), B (10%), A (5%)
    const resultYield = await searchDealsAuthenticated('mock_token', 'Address', undefined, 'yield');
    if (resultYield.mode === 'results' && resultYield.results) {
      expect(resultYield.results).toHaveLength(3);
      expect(resultYield.results[0].placeId).toBe('place_C');
      expect(resultYield.results[1].placeId).toBe('place_B');
      expect(resultYield.results[2].placeId).toBe('place_A');
    }
  });
});
