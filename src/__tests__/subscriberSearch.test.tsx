/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { searchDealsAuthenticated } from '@/actions/listings';
import SubscriberDealCard from '@/components/listings/SubscriberDealCard';
import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import { FX_1_PROJECT } from '@/lib/metrics/fixtures';
import type { DealListing, SubscriberDealMatch } from '@/types/listing';

// ── Mock Firestore & Auth ──
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnValue({ where: jest.fn().mockReturnThis(), get: mockGet });
const mockCollection = jest.fn().mockReturnValue({ where: mockWhere });

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminDb: {
    collection: (name: string) => {
      if (name === 'properties') {
        return {
          doc: (id: string) => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                id,
                placeId: 'place_fx1',
                canonicalAddress: '742 Evergreen Terrace, Springfield, IL 62704',
                city: 'Springfield',
                state: 'IL',
                zip: '62704',
                coordinates: { lat: 39.7817, lng: -89.6501 }
              })
            })
          })
        };
      }
      return mockCollection(name);
    }
  },
  adminAuth: { verifyIdToken: jest.fn() },
}));

var mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

var mockGeocode = jest.fn();
var mockPlaceDetails = jest.fn();
jest.mock('@/lib/places/placesGateway', () => ({
  __esModule: true,
  geocode: (...args: any[]) => mockGeocode(...args),
  placeDetails: (...args: any[]) => mockPlaceDetails(...args),
}));

jest.mock('@/lib/telemetry', () => ({
  __esModule: true,
  default: {
    capture: jest.fn(),
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCookieGet.mockReturnValue(undefined);
  mockWhere.mockReturnValue({ where: jest.fn().mockReturnThis(), get: mockGet });
  mockCollection.mockReturnValue({ where: mockWhere });
});

describe('searchDealsAuthenticated — DM-10 Auth & Subscription Gates', () => {
  it('throws error if ID token is missing', async () => {
    await expect(searchDealsAuthenticated('', '123 Main St')).rejects.toThrow('Missing authentication token.');
  });

  it('throws error if user is a Vendor', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'mock_user_role') return { value: 'Vendor' };
      if (name === 'mock_user_account_type') return { value: 'vendor' };
      return undefined;
    });

    await expect(searchDealsAuthenticated('mock_token', '123 Main St')).rejects.toThrow('Not Found');
  });

  it('throws error if user has an inactive subscription', async () => {
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'mock_user_role') return { value: 'Investor' };
      if (name === 'mock_user_account_type') return { value: 'investor' };
      if (name === 'mock_user_subscription_plan') return { value: 'None' };
      return undefined;
    });

    await expect(searchDealsAuthenticated('mock_token', '123 Main St')).rejects.toThrow('An active subscription is required to search deal listings.');
  });
});

describe('searchDealsAuthenticated — DM-10 Grouping by Property', () => {
  beforeEach(() => {
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

  it('groups multiple active deals under a single Property correctly (DM-D3)', async () => {
    const proj1 = { id: 'p1', placeId: 'place_abc', propertyId: 'prop_abc', propertyName: 'Unit A', financials: { purchasePrice: 200000 } };
    const proj2 = { id: 'p2', placeId: 'place_abc', propertyId: 'prop_abc', propertyName: 'Unit B', financials: { purchasePrice: 250000 } };

    const list1 = { id: 'l1', projectId: 'p1', ownerUid: 'u1', status: 'published', visibilityMode: 'MARKETPLACE', address: '123 Syndicate St', city: 'Austin', state: 'TX', zipCode: '78701' };
    const list2 = { id: 'l2', projectId: 'p2', ownerUid: 'u1', status: 'published', visibilityMode: 'MARKETPLACE', address: '123 Syndicate St', city: 'Austin', state: 'TX', zipCode: '78701' };

    // Projects collection query mock
    mockGet.mockImplementationOnce(() => Promise.resolve({
      docs: [
        { id: 'p1', data: () => proj1 },
        { id: 'p2', data: () => proj2 },
      ]
    }));

    // Listings query mock
    mockGet.mockImplementationOnce(() => Promise.resolve({
      docs: [
        { id: 'l1', data: () => list1 },
        { id: 'l2', data: () => list2 },
      ]
    }));

    const result = await searchDealsAuthenticated('mock_token', '123 Syndicate St', 'place_abc');
    expect(result.mode).toBe('results');
    
    if (result.mode === 'results' && result.results) {
      expect(result.results).toHaveLength(1);
      const propResult = result.results[0];
      expect(propResult.placeId).toBe('place_abc');
      expect(propResult.deals).toHaveLength(2);
      expect(propResult.deals[0].listing.id).toBe('l1');
      expect(propResult.deals[1].listing.id).toBe('l2');
    }
  });
});

describe('SubscriberDealCard — DM-10 & G-3 Compliance', () => {
  it('renders exact engine-derived figures matching deriveAllProjectMetrics (side-by-side verification)', () => {
    // 1. Calculate live metrics directly from FX_1_PROJECT
    const metrics = deriveAllProjectMetrics(FX_1_PROJECT);

    // 2. Assemble match data
    const listing: DealListing = {
      id: 'listing_fx1',
      projectId: 'project_fx1_seed',
      organizationId: 'org_paperworking_seed',
      ownerUid: 'user_lead_investor_seed',
      status: 'published',
      visibilityMode: 'MARKETPLACE',
      transitionLog: [],
      propertyName: '742 Evergreen Terrace (FX-1)',
      address: '742 Evergreen Terrace, Springfield, IL 62704',
      neighborhood: 'Springfield, IL',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62704',
      assetClass: 'Residential',
      subStrategy: 'LONG_TERM',
      capitalPlan: 'raise interest',
      askingPriceCents: 279_000 * 100,
      capRate: metrics.capRate || undefined,
      cashOnCash: metrics.cashOnCashReturn || undefined,
      projectedROI: metrics.roi,
      netOperatingIncome: metrics.noi ? metrics.noi * 100 : undefined,
      leadInvestor: { uid: 'u1', displayName: 'Marcus Aurelius' },
      followCount: 5,
      viewCount: 12,
      createdAt: '2026-07-19T12:00:00Z',
      updatedAt: '2026-07-19T12:00:00Z',
    };

    const match: SubscriberDealMatch = {
      listing,
      project: FX_1_PROJECT,
      metrics,
    };

    // 3. Render the card
    render(<SubscriberDealCard match={match} />);

    // 4. Assert that exact metrics display on the card (no placeholders, matching exactly)
    
    // Purchase/Asking Price should be $279,000
    expect(screen.getByText(/\$279,000/)).toBeDefined();

    // Net Operating Income should be $12,486 / yr
    expect(screen.getByText(/\$12,486/)).toBeDefined();

    // Cash-on-Cash Return should be -7.41%
    expect(screen.getByText(/-7.41%/)).toBeDefined();

    // Cap Rate should be 4.50%
    expect(screen.getByText(/4\.50%/)).toBeDefined();

    // Seeking (Funding Target) is missing in FX_1_PROJECT, showing the gap box
    // This finds two elements: "Lacking inputs" inside the Seeking box, and "Lacking Inputs (Honesty Rule)" as the header of the gap box.
    expect(screen.getAllByText(/Lacking inputs/i)).toHaveLength(2);

    // The gap box must detail the missing fields: "Funding Target"
    expect(screen.getByText(/Funding Target/i)).toBeDefined();

    // The gap box must contain the deep link back to Locked Terms card (F3.5)
    const link = screen.getByRole('link', { name: /Go to Locked Terms card \(F3\.5\) to enter data/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/dashboard/projects/project_fx1_seed/phase-2?card=F3.5');
  });
});
