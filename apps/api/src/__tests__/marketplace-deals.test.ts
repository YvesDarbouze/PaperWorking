import { describe, expect, it } from '@jest/globals';
import {
  FORBIDDEN_PUBLIC_DEAL_FIELDS,
  redactDealForPublic,
  publicDealsFor,
  sanitizeProfileInput,
} from '../lib/marketplace/investor-profile.js';
import { filterAndSortDeals } from '../lib/deals/filter-deals.js';
import { mapRawDealToPayload } from '../lib/deals/map-deal.js';
import {
  evaluateDealVisibility,
  normalizeDealSlug,
} from '../lib/deals/deal-exists.js';
import {
  filterListingsForViewer,
  sortMarketplaceListings,
} from '../lib/marketplace/listings.js';
import type { RawDealRecord } from '../lib/deals/types.js';

const rawProject = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  address: '4208 Melrose Ave',
  propertyName: 'Melrose Duplex',
  isPublicOnMarketplace: true,
  financials: { purchasePrice: 400_000 },
  sellerName: 'Ned Flanders',
  ...over,
});

const sampleDeal = (over: Partial<RawDealRecord> = {}): RawDealRecord => ({
  id: 'd1',
  slug: '123mainst',
  address: '123 Main St, Austin, TX 78701',
  status: 'published',
  visibility: 'marketplace',
  purchasePrice: 600_000,
  rehabCost: 50_000,
  arv: 750_000,
  holdingCosts: 10_000,
  projectedRoi: 18,
  creatorId: 'creator-1',
  createdAt: '2026-01-15T00:00:00.000Z',
  projects: [{ name: 'Main St Flip', propertyType: 'Multi-family', subStrategy: 'FLIP' }],
  commitments: [{ amount: 100_000, investorId: 'inv-1' }],
  invitations: [],
  ...over,
});

describe('investor profile privacy', () => {
  it('redacts unpublished deals', () => {
    expect(redactDealForPublic(rawProject({ isPublicOnMarketplace: false }))).toBeNull();
  });

  it('never leaks forbidden financial fields', () => {
    const out = redactDealForPublic(rawProject())! as Record<string, unknown>;
    for (const field of FORBIDDEN_PUBLIC_DEAL_FIELDS) {
      expect(out[field]).toBeUndefined();
    }
  });

  it('publicDealsFor drops private deals', () => {
    const deals = publicDealsFor([
      rawProject(),
      rawProject({ id: 'p2', isPublicOnMarketplace: false }),
    ]);
    expect(deals).toHaveLength(1);
    expect(deals[0]?.id).toBe('p1');
  });

  it('sanitizeProfileInput rejects team without business name', () => {
    const result = sanitizeProfileInput({ profileType: 'team', businessName: '' });
    expect(result.ok).toBe(false);
  });
});

describe('deals mapping and filtering', () => {
  it('maps raw deal to API payload', () => {
    const payload = mapRawDealToPayload(sampleDeal());
    expect(payload.propertyName).toBe('Main St Flip');
    expect(payload.fundingTarget).toBe(650_000);
    expect(payload.committedAmount).toBe(100_000);
  });

  it('filters discover tab to marketplace published deals', () => {
    const deals = [
      mapRawDealToPayload(sampleDeal()),
      mapRawDealToPayload(sampleDeal({ id: 'd2', visibility: 'private', status: 'published' })),
      mapRawDealToPayload(sampleDeal({ id: 'd3', status: 'draft' })),
    ];

    const filtered = filterAndSortDeals(deals, { tab: 'discover', userId: 'u1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('d1');
  });

  it('filters my_activity tab by creator or invitee', () => {
    const deals = [
      mapRawDealToPayload(sampleDeal({ creatorId: 'me' })),
      mapRawDealToPayload(
        sampleDeal({
          id: 'd2',
          creatorId: 'other',
          invitations: [{ inviteeUserId: 'me' }],
        }),
      ),
      mapRawDealToPayload(sampleDeal({ id: 'd3', creatorId: 'other' })),
    ];

    const filtered = filterAndSortDeals(deals, { tab: 'my_activity', userId: 'me' });
    expect(filtered.map((d) => d.id)).toEqual(['d1', 'd2']);
  });
});

describe('deal exists visibility', () => {
  it('normalizes slug', () => {
    expect(normalizeDealSlug('123-Main-St!')).toBe('123mainst');
  });

  it('hides invitation_only deals from non-invitees', () => {
    const preview = {
      id: 'd1',
      slug: 'abc',
      name: 'Deal',
      address: '123 Main',
      price: 100,
      roi: 10,
      status: 'published' as const,
      visibility: 'invitation_only' as const,
      creatorName: 'Creator',
      creatorId: 'creator',
      invitedUsers: ['invited-user'],
      committed: 0,
      target: 100,
    };

    expect(evaluateDealVisibility(preview, 'stranger')).toEqual({
      exists: false,
      deal: null,
    });
    expect(evaluateDealVisibility(preview, 'invited-user').exists).toBe(true);
  });
});

describe('marketplace listings', () => {
  it('filters non-public listings for anonymous viewers', () => {
    const listings = [
      { id: '1', visibility: 'PUBLIC' },
      { id: '2', visibility: 'PRIVATE' },
    ];
    expect(filterListingsForViewer(listings, false)).toHaveLength(1);
    expect(filterListingsForViewer(listings, true)).toHaveLength(2);
  });

  it('sorts new listings first', () => {
    const sorted = sortMarketplaceListings([
      { id: 'a', createdAt: '2026-02-01' },
      { id: 'b', isNewListing: true, createdAt: '2026-01-01' },
    ]);
    expect(sorted[0]?.id).toBe('b');
  });
});
