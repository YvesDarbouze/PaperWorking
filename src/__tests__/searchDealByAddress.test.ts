/**
 * DM-7 — searchDealByAddress unit tests
 *
 * Verifies visibility gate enforcement per DM-D9:
 * - PUBLIC_SOLICITED → teaser with non-financial attributes only
 * - MARKETPLACE → existence only (listingId)
 * - PRIVATE → cold_start (invisible)
 * - No match → cold_start
 */


// ── Mock Firestore ──────────────────────────────────────
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnValue({ where: jest.fn().mockReturnThis(), get: mockGet });
const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminDb: { collection: mockCollection },
  adminAuth: { verifyIdToken: jest.fn() },
}));

const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

const mockGeocode = jest.fn();
const mockPlaceDetails = jest.fn();
jest.mock('@/lib/places/placesGateway', () => ({
  __esModule: true,
  geocode: (...args: any[]) => mockGeocode(...args),
  placeDetails: (...args: any[]) => mockPlaceDetails(...args),
}));

jest.mock('@/lib/listings/obfuscation', () => ({
  __esModule: true,
  buildTeaserFromListing: jest.fn((listing: any) => ({
    id: listing.id,
    projectId: listing.projectId,
    status: listing.status,
    propertyName: listing.propertyName,
    neighborhood: listing.neighborhood,
    city: listing.city,
    state: listing.state,
    assetClass: listing.assetClass,
    subStrategy: listing.subStrategy,
    leadInvestorName: listing.leadInvestor?.displayName ?? 'Unknown',
    followCount: listing.followCount ?? 0,
    viewCount: listing.viewCount ?? 0,
    publishedAt: listing.publishedAt,
    // Include financial ranges (the function should strip them for PUBLIC_SOLICITED)
    capRateRange: '9–10%',
    cashOnCashRange: '8–9%',
    projectedROIRange: '12–13%',
    askingPriceApprox: '~$500K',
    fundingTargetApprox: '~$200K',
    minTicketApprox: '~$10K',
    latitude: 30.2672,
    longitude: -97.7431,
  })),
}));

// Reset chain for each test
beforeEach(() => {
  jest.clearAllMocks();
  mockCookieGet.mockReturnValue(undefined);
  mockWhere.mockReturnValue({ where: jest.fn().mockReturnThis(), get: mockGet });
  mockCollection.mockReturnValue({ where: mockWhere });
});

// ── Helpers ─────────────────────────────────────────────
function makeListing(overrides: Record<string, any>) {
  return {
    id: 'listing_test',
    projectId: 'project_test',
    organizationId: 'org_test',
    ownerUid: 'owner_test',
    status: 'published',
    visibilityMode: 'MARKETPLACE',
    transitionLog: [],
    propertyName: 'Test Property',
    address: '123 Main St, Austin, TX 78701',
    neighborhood: 'Austin, TX',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'SFR',
    subStrategy: 'Long-Term',
    latitude: 30.2672,
    longitude: -97.7431,
    askingPriceCents: 50000000,
    capRate: 9.5,
    cashOnCash: 8.29,
    projectedROI: 12.5,
    capitalPlan: 'cash',
    leadInvestor: { uid: 'uid_lead', displayName: 'Marcus Aurelius' },
    followCount: 5,
    viewCount: 12,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockFirestoreResult(docs: any[]) {
  mockGet.mockResolvedValue({
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d,
    })),
  });
}

// ── Tests ───────────────────────────────────────────────
describe('searchDealByAddress — DM-7', () => {
  let searchDealByAddress: typeof import('@/actions/listings').searchDealByAddress;

  beforeEach(async () => {
    // Dynamic import to pick up mocks
    const mod = await import('@/actions/listings');
    searchDealByAddress = mod.searchDealByAddress;
  });

  it('returns cold_start for empty input', async () => {
    const result = await searchDealByAddress('');
    expect(result.mode).toBe('cold_start');
  });

  it('returns cold_start for short input', async () => {
    const result = await searchDealByAddress('ab');
    expect(result.mode).toBe('cold_start');
  });

  it('returns cold_start when no listing matches the address', async () => {
    mockFirestoreResult([]);
    const result = await searchDealByAddress('999 Nonexistent Ave, Nowhere, TX 00000');
    expect(result.mode).toBe('cold_start');
  });

  // ── PUBLIC_SOLICITED ────────────────────────────────
  it('returns public_solicited teaser with NO financial data for PUBLIC_SOLICITED', async () => {
    mockFirestoreResult([
      makeListing({ visibilityMode: 'PUBLIC_SOLICITED' }),
    ]);

    const result = await searchDealByAddress('123 Main St, Austin');
    expect(result.mode).toBe('public_solicited');

    if (result.mode === 'public_solicited') {
      const teaser = result.teaser;
      // Non-financial attributes present
      expect(teaser.propertyName).toBe('Test Property');
      expect(teaser.neighborhood).toBe('Austin, TX');
      expect(teaser.assetClass).toBe('SFR');
      expect(teaser.subStrategy).toBe('Long-Term');
      expect(teaser.leadInvestorName).toBe('Marcus Aurelius');

      // Financial data MUST be absent
      expect(teaser.capRateRange).toBeUndefined();
      expect(teaser.cashOnCashRange).toBeUndefined();
      expect(teaser.projectedROIRange).toBeUndefined();
      expect(teaser.askingPriceApprox).toBeUndefined();
      expect(teaser.fundingTargetApprox).toBeUndefined();
      expect(teaser.minTicketApprox).toBeUndefined();
      expect(teaser.latitude).toBeUndefined();
      expect(teaser.longitude).toBeUndefined();
    }
  });

  // ── MARKETPLACE ─────────────────────────────────────
  it('returns marketplace existence-only for MARKETPLACE', async () => {
    mockFirestoreResult([
      makeListing({ visibilityMode: 'MARKETPLACE', id: 'listing_mp' }),
    ]);

    const result = await searchDealByAddress('123 Main St, Austin');
    expect(result.mode).toBe('marketplace');

    if (result.mode === 'marketplace') {
      expect(result.listingId).toBe('listing_mp');
      expect(result.exists).toBe(true);
      // No teaser, no address, no attributes
      expect((result as any).teaser).toBeUndefined();
    }
  });

  // ── PRIVATE ─────────────────────────────────────────
  it('returns cold_start (invisible) for PRIVATE', async () => {
    mockFirestoreResult([
      makeListing({ visibilityMode: 'PRIVATE' }),
    ]);

    const result = await searchDealByAddress('123 Main St, Austin');
    expect(result.mode).toBe('cold_start');
  });

  // ── Address matching ────────────────────────────────
  it('matches address case-insensitively', async () => {
    mockFirestoreResult([
      makeListing({ visibilityMode: 'MARKETPLACE', address: '123 MAIN ST, AUSTIN, TX 78701' }),
    ]);

    const result = await searchDealByAddress('123 main st, austin');
    expect(result.mode).toBe('marketplace');
  });

  it('matches partial address (substring)', async () => {
    mockFirestoreResult([
      makeListing({ visibilityMode: 'MARKETPLACE', address: '123 Main St, Austin, TX 78701' }),
    ]);

    const result = await searchDealByAddress('123 Main St, Austin');
    expect(result.mode).toBe('marketplace');
  });

  // ── Address Resolution (DM-9) ──────────────────────
  it('resolves address using placeDetails when placeId is provided on zero result', async () => {
    mockFirestoreResult([]); // zero results
    mockPlaceDetails.mockResolvedValue({
      placeId: 'place_999',
      formattedAddress: '456 Oak Ave, Austin, TX 78704',
      street: '456 Oak Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      lat: 30.25,
      lng: -97.76,
    });

    const result = await searchDealByAddress('456 Oak Ave', 'place_999');
    expect(result.mode).toBe('cold_start');
    if (result.mode === 'cold_start') {
      expect(result.resolvedAddress).toBeDefined();
      expect(result.resolvedAddress?.placeId).toBe('place_999');
      expect(result.resolvedAddress?.city).toBe('Austin');
      expect(result.resolvedAddress?.zip).toBe('78704');
      expect(result.resolvedAddress?.lat).toBe(30.25);
    }
  });

  it('geocodes address to find placeId and resolves details when placeId is missing on zero result', async () => {
    mockFirestoreResult([]); // zero results
    mockGeocode.mockResolvedValue({
      placeId: 'place_geo_888',
      lat: 30.25,
      lng: -97.76,
    });
    mockPlaceDetails.mockResolvedValue({
      placeId: 'place_geo_888',
      formattedAddress: '789 Pine Rd, Austin, TX 78704',
      street: '789 Pine Rd',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      lat: 30.25,
      lng: -97.76,
    });

    const result = await searchDealByAddress('789 Pine Rd');
    expect(result.mode).toBe('cold_start');
    if (result.mode === 'cold_start') {
      expect(mockGeocode).toHaveBeenCalledWith('789 Pine Rd', 'public');
      expect(mockPlaceDetails).toHaveBeenCalledWith('place_geo_888', expect.any(String), 'public');
      expect(result.resolvedAddress?.placeId).toBe('place_geo_888');
      expect(result.resolvedAddress?.city).toBe('Austin');
    }
  });
});

// ── getPublicListing visibility gate ────────────────────
describe('getPublicListing — DM-7 visibility gate', () => {
  let getPublicListing: typeof import('@/actions/listings').getPublicListing;

  beforeEach(async () => {
    const mod = await import('@/actions/listings');
    getPublicListing = mod.getPublicListing;
  });

  it('returns null for PRIVATE published listings', async () => {
    const mockDoc = {
      exists: true,
      data: () => makeListing({ visibilityMode: 'PRIVATE' }),
    };
    const mockDocGet = jest.fn().mockResolvedValue(mockDoc);
    const mockDocRef = jest.fn().mockReturnValue({ get: mockDocGet });
    mockCollection.mockReturnValue({ doc: mockDocRef });

    const result = await getPublicListing('listing_private');
    expect(result).toBeNull();
  });
});
