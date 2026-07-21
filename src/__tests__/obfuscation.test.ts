jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import {
  obfuscateRange,
  obfuscateApproximate,
  buildTeaserFromListing,
  OBFUSCATION_MAP,
} from '../lib/listings/obfuscation';
import type { DealListing } from '../types/listing';

/* ═══════════════════════════════════════════════════════
   Obfuscation Engine Tests (AQ-27)
   
   Verifies that the single config object + pure functions
   produce correct obfuscated output and never leak
   sensitive data to the teaser rendering.
   ═══════════════════════════════════════════════════════ */

// ── Test data ──
const MOCK_LISTING: DealListing = {
  id: 'listing-001',
  projectId: 'proj-001',
  organizationId: 'org-001',
  ownerUid: 'user-001',
  status: 'published',
  propertyName: '123 Main Street Duplex',
  address: '123 Main Street, Brooklyn, NY 11201',
  neighborhood: 'Brooklyn, NY',
  city: 'Brooklyn',
  state: 'NY',
  zipCode: '11201',
  assetClass: 'Residential',
  subStrategy: 'BRRRR',
  askingPriceCents: 45000000,  // $450,000
  capRate: 4.73,
  cashOnCash: 8.2,
  projectedROI: 22.5,
  netOperatingIncome: 3600000,  // $36,000
  equityTerms: {
    fundingTarget: 10000000,   // $100,000
    equityOfferedPct: 25,
    minTicket: 2500000,        // $25,000
    priceBasis: 45000000,      // $450,000
  },
  capitalPlan: 'raise interest',
  leadInvestor: {
    uid: 'user-001',
    displayName: 'Jane Doe',
    bio: 'Real estate investor with 10 years experience.',
    avatarUrl: 'https://example.com/avatar.jpg',
  },
  followCount: 15,
  viewCount: 120,
  createdAt: '2024-01-01T00:00:00Z',
  publishedAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('obfuscateRange', () => {
  it('rounds to nearest band', () => {
    expect(obfuscateRange(4.73, 1)).toBe('4–5%');
    expect(obfuscateRange(5.0, 1)).toBe('5–6%');
    expect(obfuscateRange(8.2, 2)).toBe('8–10%');
    expect(obfuscateRange(22.5, 5)).toBe('20–25%');
  });

  it('handles zero', () => {
    expect(obfuscateRange(0, 1)).toBe('0–1%');
    expect(obfuscateRange(0, 5)).toBe('0–5%');
  });

  it('returns undefined for null/undefined/NaN', () => {
    expect(obfuscateRange(undefined, 1)).toBeUndefined();
    expect(obfuscateRange(NaN, 1)).toBeUndefined();
  });
});

describe('obfuscateApproximate', () => {
  it('renders millions', () => {
    expect(obfuscateApproximate(125000000)).toBe('~$1.3M'); // $1,250,000
  });

  it('renders thousands', () => {
    expect(obfuscateApproximate(45000000)).toBe('~$450K');  // $450,000
    expect(obfuscateApproximate(10000000)).toBe('~$100K');  // $100,000
    expect(obfuscateApproximate(2500000)).toBe('~$25K');    // $25,000
  });

  it('handles sub-1K values', () => {
    expect(obfuscateApproximate(75000)).toBe('~$800');      // $750 → round to nearest $100
  });

  it('returns undefined for null/undefined/NaN', () => {
    expect(obfuscateApproximate(undefined)).toBeUndefined();
    expect(obfuscateApproximate(NaN)).toBeUndefined();
  });
});

describe('buildTeaserFromListing', () => {
  const teaser = buildTeaserFromListing(MOCK_LISTING);

  it('includes listing ID and project ID', () => {
    expect(teaser.id).toBe('listing-001');
    expect(teaser.projectId).toBe('proj-001');
  });

  it('includes neighborhood but NOT full address', () => {
    expect(teaser.neighborhood).toBe('Brooklyn, NY');
    expect(teaser.city).toBe('Brooklyn');
    expect(teaser.state).toBe('NY');
    // The teaser type doesn't have an 'address' field
    expect((teaser as unknown as Record<string, unknown>).address).toBeUndefined();
  });

  it('obfuscates cap rate to range', () => {
    expect(teaser.capRateRange).toBe('4–5%');
  });

  it('obfuscates cash-on-cash to range', () => {
    expect(teaser.cashOnCashRange).toBe('8–10%');
  });

  it('obfuscates projected ROI to range', () => {
    expect(teaser.projectedROIRange).toBe('20–25%');
  });

  it('approximates asking price', () => {
    expect(teaser.askingPriceApprox).toBe('~$450K');
  });

  it('shows approximate funding target', () => {
    expect(teaser.fundingTargetApprox).toBe('Seeking ~$100K');
  });

  it('shows approximate min ticket', () => {
    expect(teaser.minTicketApprox).toBe('~$25K minimum');
  });

  it('shows only lead investor name (no UID, no bio, no avatar)', () => {
    expect(teaser.leadInvestorName).toBe('Jane Doe');
    expect((teaser as unknown as Record<string, unknown>).leadInvestor).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).leadInvestorBio).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).leadInvestorAvatar).toBeUndefined();
  });

  it('preserves counters', () => {
    expect(teaser.followCount).toBe(15);
    expect(teaser.viewCount).toBe(120);
  });

  it('preserves publishedAt', () => {
    expect(teaser.publishedAt).toBe('2024-01-02T00:00:00Z');
  });

  it('never includes equity offered percentage', () => {
    expect((teaser as unknown as Record<string, unknown>).equityOfferedPct).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).equityTerms).toBeUndefined();
  });

  it('never includes exact financial values', () => {
    expect((teaser as unknown as Record<string, unknown>).askingPriceCents).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).capRate).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).cashOnCash).toBeUndefined();
    expect((teaser as unknown as Record<string, unknown>).netOperatingIncome).toBeUndefined();
  });
});

describe('OBFUSCATION_MAP config', () => {
  it('marks address as neighborhood strategy', () => {
    expect(OBFUSCATION_MAP.address.strategy).toBe('neighborhood');
  });

  it('marks documents as hidden', () => {
    expect(OBFUSCATION_MAP.documents.strategy).toBe('hidden');
  });

  it('marks lead investor contact as hidden', () => {
    expect(OBFUSCATION_MAP.leadInvestorContact.strategy).toBe('hidden');
  });

  it('marks terms as summary strategy', () => {
    expect(OBFUSCATION_MAP.terms.strategy).toBe('summary');
  });
});
