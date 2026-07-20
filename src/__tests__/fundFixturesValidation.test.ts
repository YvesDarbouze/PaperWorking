import {
  deriveAllProjectMetrics,
  calculateSyndicationDistribution,
} from '../lib/metrics/reiMetrics';
import {
  FX_1_PROJECT,
  FX_2_PROJECT,
  FX_2_INVESTORS_INITIAL,
  FX_2_INVESTORS_UPDATED,
  FX_3_PROJECT,
  FX_4_PROJECT,
  FX_5_PROJECT,
  FX_6_PROJECT,
  FX_7_PROJECT_STANDARD,
  FX_7_PROJECT_SPECIAL,
  FX_8_PROJECT,
} from '../lib/metrics/fixtures';
import { reconcileProjectCapital } from '../lib/math/reconciliation';

describe('FD-6 Fund Fixture Families Validation Tests', () => {
  
  describe('FX-1: Canonical Mortgage Continuation', () => {
    it('reproduces the five golden values from live deriveAllProjectMetrics using the LoanRecord', () => {
      const metrics = deriveAllProjectMetrics(FX_1_PROJECT);

      // 1. NOI (gross-basis PM fee, P6 canon)
      expect(metrics.noi).toBe(12_486);
      
      // 2. Annual Cash Flow: NOI - Debt Service = 12486 - 16930 = -4444
      expect(metrics.annualCashFlow).toBeCloseTo(-4444, 1);
      
      // 3. DSCR: NOI / Debt Service = 12486 / 16930 = 0.74
      expect(metrics.dscr).toBeCloseTo(0.74, 2);
      
      // 4. Cash-on-Cash Return: -4443.31 / 60000 = -7.41%
      expect(metrics.cashOnCashReturn).toBeCloseTo(-7.41, 1);
      
      // 5. Gross Rent Multiplier (GRM): 279000 / 23400 = 11.92
      expect(metrics.grossRentMultiplier).toBeCloseTo(11.92, 2);
      
      // LTV: 223200 / 279000 = 80.00% (against Purchase)
      expect(metrics.ltv).toBeCloseTo(80.00, 2);
    });
  });

  describe('FX-2: Co-Buy TIC Recalculation', () => {
    it('calculates initial 60/40 TIC split correct basis', () => {
      const metrics = deriveAllProjectMetrics(FX_2_PROJECT);
      const shares = metrics.coBuyShares || [];
      
      expect(shares.find(s => s.id === 'party_a')?.ownershipPct).toBe(60.0);
      expect(shares.find(s => s.id === 'party_b')?.ownershipPct).toBe(40.0);
      
      const sum = shares.reduce((acc, s) => acc + s.ownershipPct, 0);
      expect(Math.round(sum)).toBe(100);
    });

    it('recalculates shares after capital addition (57.92% / 42.08%)', () => {
      const updatedProject = {
        ...FX_2_PROJECT,
        fractionalInvestors: FX_2_INVESTORS_UPDATED,
      };
      
      const metrics = deriveAllProjectMetrics(updatedProject);
      const shares = metrics.coBuyShares || [];
      
      expect(shares.find(s => s.id === 'party_a')?.ownershipPct).toBe(57.92);
      expect(shares.find(s => s.id === 'party_b')?.ownershipPct).toBe(42.08);
      
      const sum = shares.reduce((acc, s) => acc + s.ownershipPct, 0);
      expect(Math.round(sum * 100) / 100).toBe(100.00);
    });

    it('enforces equal shares under JTWROS variant', () => {
      const jtwrosProject = {
        ...FX_2_PROJECT,
        financials: {
          ...FX_2_PROJECT.financials,
          titleHolding: 'JTWROS',
        },
      };

      const metrics = deriveAllProjectMetrics(jtwrosProject);
      const shares = metrics.coBuyShares || [];
      
      expect(shares.find(s => s.id === 'party_a')?.ownershipPct).toBe(50.0);
      expect(shares.find(s => s.id === 'party_b')?.ownershipPct).toBe(50.0);
    });
  });

  describe('FX-3: Syndication, Straight Split', () => {
    it('calculates straight 70% LP / 30% GP split correctly', () => {
      const struct = FX_3_PROJECT.financials.distributionStructure!;
      const res = calculateSyndicationDistribution(900_000, 0, 100_000, struct as any);
      
      expect(res.lpTotal).toBe(70_000);
      expect(res.gpTotal).toBe(30_000);
    });
  });

  describe('FX-4: Syndication, 7% Preferred Return (Non-Cumulative)', () => {
    it('calculates non-cumulative preferred return and remainder pool split correctly', () => {
      const struct = FX_4_PROJECT.financials.distributionStructure!;
      const res = calculateSyndicationDistribution(900_000, 0, 100_000, struct as any);
      
      expect(res.lpPreferred).toBe(63_000);
      expect(res.lpTotal).toBe(88_900);
      expect(res.gpTotal).toBe(11_100);
    });
  });

  describe('FX-5: Syndication, 7% Preferred Return (Cumulative, Two Periods)', () => {
    const struct = FX_5_PROJECT.financials.distributionStructure!;

    it('calculates period 1 shortfall correctly', () => {
      const p1 = calculateSyndicationDistribution(900_000, 0, 50_000, struct as any);
      
      expect(p1.lpTotal).toBe(50_000);
      expect(p1.gpTotal).toBe(0);
      expect(p1.shortfallAccrued).toBe(13_000);
    });

    it('calculates period 2 distribution including carry-over shortfall correctly', () => {
      const p2 = calculateSyndicationDistribution(900_000, 0, 100_000, struct as any, 13_000);
      
      expect(p2.lpPreferred).toBe(76_000);
      expect(p2.lpTotal).toBe(92_800);
      expect(p2.gpTotal).toBe(7_200);
    });
  });

  describe('FX-6: Distribution Waterfall (Three Tiers)', () => {
    it('calculates three-tier waterfall distribution correctly', () => {
      const struct = FX_6_PROJECT.financials.distributionStructure!;
      const res = calculateSyndicationDistribution(900_000, 0, 180_000, struct as any);
      
      expect(res.lpTotal).toBe(139_500);
      expect(res.gpTotal).toBe(40_500);
    });
  });

  describe('FX-7: SBA 504 structure constraints', () => {
    it('verifies standard variant constraints', () => {
      const struct = FX_7_PROJECT_STANDARD.financials.sbaLoanStructure!;
      expect(struct.bankLienPct).toBe(50);
      expect(struct.cdcDebenturePct).toBe(40);
      expect(struct.borrowerInjectionPct).toBe(10);
      expect(struct.bankLienPct + struct.cdcDebenturePct + struct.borrowerInjectionPct).toBe(100);
    });

    it('verifies special purpose variant constraints', () => {
      const struct = FX_7_PROJECT_SPECIAL.financials.sbaLoanStructure!;
      expect(struct.bankLienPct).toBe(50);
      expect(struct.cdcDebenturePct).toBe(35);
      expect(struct.borrowerInjectionPct).toBe(15);
      expect(struct.bankLienPct + struct.cdcDebenturePct + struct.borrowerInjectionPct).toBe(100);
    });
  });

  describe('FX-8: Cash-to-Close Reconciliation', () => {
    it('reconciles sources and uses to zero variance', () => {
      const res = reconcileProjectCapital(FX_8_PROJECT);
      
      expect(res.totalUses).toBe(284_000);
      expect(res.totalSources).toBe(284_000);
      expect(res.variance).toBe(0);
      expect(res.isReconciled).toBe(true);
    });
  });
});
