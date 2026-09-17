import { describe, expect, it } from '@jest/globals';
import {
  canonicalDemoDeal,
  reconcileAcquisitionUnderwriting,
} from '../index.js';
import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics.js';

describe('MISSION W2-07: Cap-Rate vs Yield-on-Cost Labeling & Precision', () => {
  it('1. canonical 6.4% Cap Rate on Cost invariant holds strictly', () => {
    const reconciled = reconcileAcquisitionUnderwriting(canonicalDemoDeal);

    // Purchase Price: $520,000, Closing Costs (3%): $15,600, Rehab: $59,800
    // Total Cost Basis = $595,400
    // Year-1 NOI = $38,138
    // Cap Rate on Cost = $38,138 / $595,400 = 6.40544...% -> rounded to 1 decimal: 6.4%
    expect(reconciled.totalCostBasis).toBe(595400);
    expect(reconciled.netOperatingIncome).toBe(38138);
    expect(reconciled.capRateOnCost).toBeCloseTo(6.41, 1);
    expect(Number(reconciled.capRateOnCost.toFixed(1))).toBe(6.4);
    expect(reconciled.yieldOnCostPct).toBe(6.4);
  });

  it('2. deriveAllProjectMetrics surfaces both capRateOnCost and market capRate distinctly', async () => {
    const metrics = await deriveAllProjectMetrics('test-deal-id', {
      mockData: {
        ...canonicalDemoDeal,
        id: 'test-deal-id',
        purchase_price: 520000,
        purchasePrice: 520000,
        rehab_costs: 59800,
        rehabBudget: 59800,
        gross_rent: 4200,
        grossRentMonthly: 4200,
        operating_expense_ratio: 0.3388,
        operatingExpenseRatioPct: 33.88,
        vacancy_rate: 0.05,
        vacancyRatePct: 5.0,
      },
    });

    // Both market cap rate and cap rate on cost are surfaced on derived
    expect(metrics.derived.capRate).toBeDefined();
    expect(metrics.derived.capRateOnCost).toBeDefined();
    expect(metrics.derived.yieldOnCostPct).toBeDefined();
    expect(metrics.scorecard.capRate.value).toBe(metrics.derived.capRate);
  });

  it('3. distinguishes value-add expansion: Cap Rate on Cost updates with renovation capital', () => {
    // Before rehab:
    const acquisitionOnly = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      rehabBudget: 0,
    });
    // With rehab:
    const withRehab = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      rehabBudget: 100000,
    });

    // Higher cost basis with identical Year-1 NOI lowers initial Cap Rate on Cost
    expect(acquisitionOnly.capRateOnCost).toBeGreaterThan(withRehab.capRateOnCost);
    expect(withRehab.totalCostBasis).toBe(canonicalDemoDeal.purchasePrice * 1.03 + 100000);
  });

  it('4. preserves 2-decimal precision on capRateOnCost and 1-decimal on yieldOnCostPct', () => {
    const reconciled = reconcileAcquisitionUnderwriting(canonicalDemoDeal);

    // Purchase Price $520,000 + 3% Closing $15,600 + Rehab $59,800 = $595,400
    // NOI = $38,138
    // Cap rate on cost: (38138 / 595400) * 100 = 6.4054... -> 6.4%
    expect(reconciled.capRateOnCost).toBe(6.4);
    // Yield on cost is rounded to 1 decimal for executive display
    expect(reconciled.yieldOnCostPct).toBe(6.4);
  });
});
