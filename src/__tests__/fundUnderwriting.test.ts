jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { calculateDistributions, DistributionStructure } from '../lib/metrics/reiMetrics';
import { cacheFinancials, getCachedFinancials, mapPostgresProjectToFrontend } from '../lib/db/projects';

describe('Phase 2 Fund Underwriting & Calculations', () => {
  
  describe('Distribution Engine (calculateDistributions)', () => {
    
    // FX-3 · Syndication, straight split
    it('verifies FX-3: Syndication straight split (70% LP / 30% GP)', () => {
      const structure: DistributionStructure = {
        type: 'straight_split',
        lpSplitPct: 70,
        gpSplitPct: 30
      };
      const res = calculateDistributions(structure, 900000, 0, 100000);
      expect(res.lpTotal).toBe(70000);
      expect(res.gpTotal).toBe(30000);
    });

    // FX-4 · Syndication, 7% preferred (non-cumulative), single period
    it('verifies FX-4: 7% preferred non-cumulative return (70/30 split on remainder)', () => {
      const structure: DistributionStructure = {
        type: 'preferred_return',
        lpSplitPct: 70,
        gpSplitPct: 30,
        preferredRate: 7,
        preferredType: 'non_cumulative'
      };
      
      const res = calculateDistributions(structure, 900000, 0, 100000);
      // LP preferred due = 900,000 * 7% = 63,000.
      // lpPreferred = 63,000.
      // Remainder = 100,000 - 63,000 = 37,000.
      // LP Remainder Share = 37,000 * 70% = 25,900.
      // GP Remainder Share = 37,000 * 30% = 11,100.
      // LP Total = 63,000 + 25,900 = 88,900.
      // GP Total = 11,100.
      expect(res.lpPreferred).toBe(63000);
      expect(res.lpRemainder).toBe(25900);
      expect(res.gpRemainder).toBe(11100);
      expect(res.lpTotal).toBe(88900);
      expect(res.gpTotal).toBe(11100);
      expect(res.shortfallCreated).toBe(0);
    });

    // FX-5 · Syndication, 7% preferred (cumulative), two periods
    it('verifies FX-5: 7% preferred cumulative return over two periods with shortfall', () => {
      const structure: DistributionStructure = {
        type: 'preferred_return',
        lpSplitPct: 70,
        gpSplitPct: 30,
        preferredRate: 7,
        preferredType: 'cumulative'
      };

      // Period 1: Distributable cash $50,000
      // Preferred due: 900,000 * 7% = 63,000
      // LP receives 50,000. GP receives 0. Shortfall = 13,000.
      const period1 = calculateDistributions(structure, 900000, 0, 50000, 0);
      expect(period1.lpTotal).toBe(50000);
      expect(period1.gpTotal).toBe(0);
      expect(period1.shortfallCreated).toBe(13000);

      // Period 2: Distributable cash $100,000. Shortfall carried forward: $13,000.
      // Total preferred due: 63,000 (current) + 13,000 (shortfall) = 76,000.
      // LP Preferred = 76,000.
      // Remainder pool = 100,000 - 76,000 = 24,000.
      // LP Remainder split = 24,000 * 70% = 16,800.
      // GP Remainder split = 24,000 * 30% = 7,200.
      // LP Yr 2 Total = 76,000 + 16,800 = 92,800.
      // GP Yr 2 Total = 7,200.
      const period2 = calculateDistributions(structure, 900000, 0, 100000, period1.shortfallCreated);
      expect(period2.lpPreferred).toBe(76000);
      expect(period2.lpRemainder).toBe(16800);
      expect(period2.gpRemainder).toBe(7200);
      expect(period2.lpTotal).toBe(92800);
      expect(period2.gpTotal).toBe(7200);
      expect(period2.shortfallCreated).toBe(0);
    });

    // FX-6 · Distribution waterfall, three tiers
    it('verifies FX-6: Three-tier distribution waterfall', () => {
      const structure: DistributionStructure = {
        type: 'waterfall',
        lpSplitPct: 50, // default/fallback
        gpSplitPct: 50,
        tiers: [
          { thresholdPct: 7, lpSplitPct: 100, gpSplitPct: 0 },   // Tier 1: 100% LP up to 7% cumulative return ($63k)
          { thresholdPct: 14, lpSplitPct: 70, gpSplitPct: 30 },  // Tier 2: 70% LP / 30% GP up to 14% LP cumulative ($126k)
          { thresholdPct: 999, lpSplitPct: 50, gpSplitPct: 50 }  // Tier 3: 50% LP / 50% GP
        ]
      };

      const res = calculateDistributions(structure, 900000, 0, 180000);
      // Tier 1: LP threshold = 63,000. LP receives 63,000. poolRemaining = 117,000.
      // Tier 2: LP cumulative limit = 126,000. LP split = 70%.
      // LP remaining needed in Tier 2 = 126,000 - 63,000 = 63,000.
      // Pool needed for Tier 2 = 63,000 / 0.7 = 90,000.
      // Tier 2 consumes 90,000: LP gets 63,000, GP gets 27,000. poolRemaining = 27,000.
      // Tier 3: split is 50/50. Remaining 27,000: LP gets 13,500, GP gets 13,500.
      // LP Total = 63,000 (Tier 1) + 63,000 (Tier 2) + 13,500 (Tier 3) = 139,500.
      // GP Total = 0 (Tier 1) + 27,000 (Tier 2) + 13,500 (Tier 3) = 40,500.
      expect(res.lpTotal).toBe(139500);
      expect(res.gpTotal).toBe(40500);
      expect(res.tierAllocations).toBeDefined();
      expect(res.tierAllocations![0]).toEqual({ lp: 63000, gp: 0, poolUsed: 63000 });
      expect(res.tierAllocations![1]).toEqual({ lp: 63000, gp: 27000, poolUsed: 90000 });
      expect(res.tierAllocations![2]).toEqual({ lp: 13500, gp: 13500, poolUsed: 27000 });
    });

  });

  describe('Cache layer synchronization & Postgres mapping', () => {
    
    it('stores and retrieves Phase 2 data fields in the financials cache file', () => {
      const mockProjectId = 'test-project-fund-cache';
      const payload = {
        fundingPlan: { modality: ['conventional_loan', 'co_buyer_equity'], status: 'completed' },
        capitalSources: [{ id: '1', type: 'cash', amount: 50000, status: 'verified' }],
        equityParties: [{ name: 'A', percent: 60 }, { name: 'B', percent: 40 }],
        loans: [{ id: 'loan-1', lender: 'Chase', rate: 6.5 }],
        contributions: [{ partyId: 'A', amount: 30000 }],
        titleHolding: { method: 'TIC', detail: 'Tenants in common' },
        milestoneTimeline: { currentStage: 'closing' },
        closingRecord: { scheduledDate: '2026-08-01', actualDate: '' },
      };

      cacheFinancials(mockProjectId, payload);
      
      const cached = getCachedFinancials(mockProjectId);
      expect(cached.fundingPlan).toEqual(payload.fundingPlan);
      expect(cached.capitalSources).toEqual(payload.capitalSources);
      expect(cached.equityParties).toEqual(payload.equityParties);
      expect(cached.loans).toEqual(payload.loans);
      expect(cached.contributions).toEqual(payload.contributions);
      expect(cached.titleHolding).toEqual(payload.titleHolding);
      expect(cached.milestoneTimeline).toEqual(payload.milestoneTimeline);
      expect(cached.closingRecord).toEqual(payload.closingRecord);

      // Verify mapping function extracts these cached values correctly
      const mockProject = {
        id: mockProjectId,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        entryStage: 'acquisition',
        propertyType: 'single_family',
        units: 1,
        askingPriceCents: 20000000,
        collaborators: [],
      };

      const mapped = mapPostgresProjectToFrontend(mockProject);
      expect(mapped).toBeDefined();
      expect(mapped?.fundingPlan).toEqual(payload.fundingPlan);
      expect(mapped?.capitalSources).toEqual(payload.capitalSources);
      expect(mapped?.equityParties).toEqual(payload.equityParties);
      expect(mapped?.loans).toEqual(payload.loans);
      expect(mapped?.contributions).toEqual(payload.contributions);
      expect(mapped?.titleHolding).toEqual(payload.titleHolding);
      expect(mapped?.milestoneTimeline).toEqual(payload.milestoneTimeline);
      expect(mapped?.closingRecord).toEqual(payload.closingRecord);
    });

  });

});
