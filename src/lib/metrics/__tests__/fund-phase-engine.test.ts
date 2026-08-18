import { computeFundPhaseMetrics, computeIRR } from '../fund-phase-engine';

describe('Agent 4: Fund-Phase Engine Unit Tests', () => {
  test('IRR Newton-Raphson & fallback calculation accuracy', () => {
    const cashFlows = [
      { date: '2024-01-01', amount: -100000 },
      { date: '2025-01-01', amount: 10000 },
      { date: '2026-01-01', amount: 120000 },
    ];

    const irr = computeIRR(cashFlows);
    expect(irr).not.toBeNull();
    expect(irr!).toBeGreaterThan(12.0);
    expect(irr!).toBeLessThan(18.0);
  });

  test('Waterfall distributions with 2 tiers and preferred return accrual', () => {
    const investors = [
      { id: 'inv_1', name: 'LP 1', capitalContributed: 80000, ownershipPct: 80 },
      { id: 'inv_2', name: 'GP 1', capitalContributed: 20000, ownershipPct: 20, isGP: true },
    ];

    const tiers = [
      { hurdleIrrPct: 8, lpSplitPct: 80, gpSplitPct: 20 },
      { hurdleIrrPct: 15, lpSplitPct: 70, gpSplitPct: 30 },
    ];

    const cashFlows = [
      { date: '2025-01-01', amount: -100000 },
      { date: '2026-01-01', amount: 130000 },
    ];

    const result = computeFundPhaseMetrics(investors, 8, tiers, 20, cashFlows);

    expect(result.irr).not.toBeNull();
    expect(result.totalPreferredReturnAccrued).toBe(8000); // 8% of 100k
    expect(result.investorResults.length).toBe(2);
    expect(result.investorResults[0].equityMultiple).toBeGreaterThan(1.0);
  });
});
