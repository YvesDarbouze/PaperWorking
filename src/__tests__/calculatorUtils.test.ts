/**
 * Phase 4 Financial Engine — Unit Tests
 * Tests: computeAutopsyMetrics, calculateNetEngine, calculateSeventyPercentRule,
 *        computeSettlementDefaults, recomputeSettlement, computeCapitalGainsTax
 */
import {
  computeAutopsyMetrics,
  calculateNetEngine,
  calculateSeventyPercentRule,
  computeSettlementDefaults,
  recomputeSettlement,
  computeCapitalGainsTax,
  calculateEquityPayout,
} from '@/lib/math/calculatorUtils';
import type { Project, ProjectFinancials } from '@/types/schema';

// ── Factory: minimal Project shell ─────────────────────────
function makeProject(overrides: Partial<Project> = {}): Project {
  const base: Project = {
    id: 'test-001',
    organizationId: 'org-001',
    propertyName: 'Test Property',
    address: '123 Main St, Miami FL 33101',
    status: 'Active',
    members: {},
    financials: { purchasePrice: 0, estimatedARV: 0, costs: [] },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    ownerUid: 'uid-owner',
  };
  return { ...base, ...overrides } as Project;
}

// ═══════════════════════════════════════════════════════════════
// 1. 70 % Rule
// ═══════════════════════════════════════════════════════════════
describe('calculateSeventyPercentRule', () => {
  it('computes MAO correctly', () => {
    const r = calculateSeventyPercentRule(350_000, 65_000, 200_000);
    expect(r.MAO).toBe(350_000 * 0.7 - 65_000); // 180 000
  });
  it('flags overbought when purchase > MAO', () => {
    const r = calculateSeventyPercentRule(300_000, 50_000, 250_000);
    expect(r.isOverbought).toBe(true);
  });
  it('returns not overbought when purchase < MAO', () => {
    const r = calculateSeventyPercentRule(350_000, 65_000, 150_000);
    expect(r.isOverbought).toBe(false);
  });
  it('returns isSetup=false when ARV is 0', () => {
    expect(calculateSeventyPercentRule(0, 65_000, 150_000).isSetup).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. computeAutopsyMetrics — Historical Cost Aggregation
// ═══════════════════════════════════════════════════════════════
describe('computeAutopsyMetrics', () => {
  const complexDeal = makeProject({
    financials: {
      purchasePrice: 200_000,
      estimatedARV: 350_000,
      actualSalePrice: 350_000,
      costs: [
        { id: '1', description: 'Roof', amount: 30_000, approved: true, addedBy: 'u', createdAt: new Date() },
        { id: '2', description: 'Paint', amount: 10_000, approved: true, addedBy: 'u', createdAt: new Date() },
        { id: '3', description: 'Rejected', amount: 5_000, approved: false, addedBy: 'u', createdAt: new Date() },
      ],
      projectedRehabCost: 65_000,
      loanAmount: 160_000,
      loanOriginationPoints: 2,
      buyersAgentCommission: 3,
      sellersAgentCommission: 3,
      finalClosingCosts: 5_000,
      acquisitionDate: new Date('2024-01-15'),
      soldDate: new Date('2024-07-15'),
      listingDate: new Date('2024-06-01'),
    } as ProjectFinancials,
    rehabExpenses: [
      { id: 'r1', category: 'Demo', description: 'Demo', amount: 25_000, paid: true, createdAt: new Date() },
    ],
    holdingCosts: [
      { id: 'h1', type: 'Property Tax', monthlyAmount: 800, monthsPaid: 6, totalMonths: 6, notes: '' },
      { id: 'h2', type: 'Insurance', monthlyAmount: 200, monthsPaid: 6, totalMonths: 6, notes: '' },
    ],
    costBasisLedger: {
      directAcquisition: [{ id: 'da1', label: 'Title', amount: 3_000, paid: true, notes: '' }],
      financing: [{ id: 'f1', label: 'Appraisal', amount: 500, paid: true, notes: '' }],
      preClosing: [{ id: 'pc1', label: 'Inspection', amount: 500, paid: true, notes: '' }],
    },
  } as any);

  it('sums approved costs + rehabExpenses into actualRehabCost', () => {
    const m = computeAutopsyMetrics(complexDeal);
    // approved costs: 30k + 10k = 40k, rehabExpenses: 25k = 65k total
    expect(m.actualRehabCost).toBe(65_000);
  });

  it('calculates acquisition costs from origination + costBasisLedger', () => {
    const m = computeAutopsyMetrics(complexDeal);
    // origination: 160k * 2% = 3200, ledger: 3000+500+500 = 4000 => 7200
    expect(m.acquisitionCosts).toBe(7_200);
  });

  it('aggregates totalCostBasis across all five buckets', () => {
    const m = computeAutopsyMetrics(complexDeal);
    // purchase(200k) + rehab(65k) + acquisition(7.2k) + holding(dynamic) + sellClosing(dynamic)
    expect(m.totalCostBasis).toBeGreaterThan(200_000 + 65_000 + 7_200);
  });

  it('derives netProfit = grossSalePrice - totalCostBasis', () => {
    const m = computeAutopsyMetrics(complexDeal);
    expect(m.netProfit).toBeCloseTo(m.grossSalePrice - m.totalCostBasis, 0);
  });

  it('derives ROI = (netProfit / totalCostBasis) * 100', () => {
    const m = computeAutopsyMetrics(complexDeal);
    const expected = (m.netProfit / m.totalCostBasis) * 100;
    expect(m.roi).toBeCloseTo(expected, 4);
  });

  it('calculates days on market from listingDate → soldDate', () => {
    const m = computeAutopsyMetrics(complexDeal);
    // June 1 → July 15 = 44 days
    expect(m.dom).toBe(44);
  });

  it('returns 0 netProfit for a break-even deal', () => {
    const breakEven = makeProject({
      financials: { purchasePrice: 100_000, estimatedARV: 100_000, actualSalePrice: 100_000, costs: [] } as ProjectFinancials,
    });
    const m = computeAutopsyMetrics(breakEven);
    expect(m.netProfit).toBe(0);
  });

  it('handles empty project gracefully', () => {
    const empty = makeProject();
    const m = computeAutopsyMetrics(empty);
    expect(m.purchasePrice).toBe(0);
    expect(m.netProfit).toBe(0);
    expect(m.roi).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. calculateNetEngine
// ═══════════════════════════════════════════════════════════════
describe('calculateNetEngine', () => {
  const deal = makeProject({
    financials: {
      purchasePrice: 200_000,
      estimatedARV: 350_000,
      actualSalePrice: 350_000,
      costs: [{ id: '1', description: 'Rehab', amount: 50_000, approved: true, addedBy: 'u', createdAt: new Date() }],
      buyersAgentCommission: 3,
      sellersAgentCommission: 3,
    } as ProjectFinancials,
  });

  it('calculates ROI from totalInvestment', () => {
    const r = calculateNetEngine(deal, false);
    expect(r.roi).toBeDefined();
    expect(typeof r.roi).toBe('number');
  });

  it('applies 75% factor for BRRRR strategy', () => {
    const sell = calculateNetEngine(deal, false);
    const brrr = calculateNetEngine(deal, true);
    expect(brrr.proceeds).toBe(sell.proceeds * 0.75);
  });

  it('zeroes commissions for BRRRR', () => {
    const brrr = calculateNetEngine(deal, true);
    expect(brrr.actualCommissions).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Settlement Defaults & Recomputation
// ═══════════════════════════════════════════════════════════════
describe('Settlement calculations', () => {
  it('generates 7 default line items', () => {
    const items = computeSettlementDefaults(300_000);
    expect(items).toHaveLength(7);
  });

  it('computes percentage-based amounts correctly', () => {
    const items = computeSettlementDefaults(300_000);
    const listing = items.find(i => i.id === 'sl-listing-agent')!;
    expect(listing.computedAmount).toBe(9_000); // 3% of 300k
  });

  it('keeps flat amounts unchanged on recompute', () => {
    const items = computeSettlementDefaults(300_000);
    const recomputed = recomputeSettlement(items, 400_000);
    const attorney = recomputed.find(i => i.id === 'sl-attorney')!;
    expect(attorney.computedAmount).toBe(1_500); // flat
  });

  it('updates percentage items on recompute', () => {
    const items = computeSettlementDefaults(300_000);
    const recomputed = recomputeSettlement(items, 400_000);
    const listing = recomputed.find(i => i.id === 'sl-listing-agent')!;
    expect(listing.computedAmount).toBe(12_000); // 3% of 400k
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Capital Gains Tax Estimator
// ═══════════════════════════════════════════════════════════════
describe('computeCapitalGainsTax', () => {
  it('applies short-term rate for holds ≤ 365 days', () => {
    // Pin acquisition + sale dates so holdDays is always ~120 regardless of when the test runs
    const deal = makeProject({
      financials: {
        purchasePrice: 200_000,
        estimatedARV: 350_000,
        actualSalePrice: 350_000,
        costs: [],
        acquisitionDate: new Date('2024-01-01'),
        soldDate: new Date('2024-05-01'),   // 121 days → short-term
        marginalTaxBracket: 32,
      } as ProjectFinancials,
    });
    const t = computeCapitalGainsTax(deal);
    expect(t.isLongTerm).toBe(false);
    expect(t.estimatedTaxRate).toBe(32);
  });

  it('applies long-term 15% rate for holds > 365 days', () => {
    const deal = makeProject({
      financials: {
        purchasePrice: 200_000,
        estimatedARV: 350_000,
        actualSalePrice: 350_000,
        costs: [],
        acquisitionDate: new Date('2023-01-01'),
        soldDate: new Date('2024-06-01'),
      } as ProjectFinancials,
    });
    const t = computeCapitalGainsTax(deal);
    expect(t.isLongTerm).toBe(true);
    expect(t.estimatedTaxRate).toBe(15);
  });

  it('returns 0 tax liability when no profit', () => {
    const deal = makeProject({
      financials: {
        purchasePrice: 350_000,
        estimatedARV: 350_000,
        actualSalePrice: 200_000,
        costs: [],
      } as ProjectFinancials,
    });
    const t = computeCapitalGainsTax(deal);
    expect(t.estimatedTaxLiability).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Equity Payout
// ═══════════════════════════════════════════════════════════════
describe('calculateEquityPayout', () => {
  it('returns no-deal defaults when undefined', () => {
    const r = calculateEquityPayout(undefined);
    expect(r.isSold).toBe(false);
    expect(r.calculationStatus).toBe('No Deal Selected');
  });

  it('distributes profit pro-rata among investors', () => {
    const deal = makeProject({
      status: 'Sold',
      financials: {
        purchasePrice: 200_000,
        estimatedARV: 350_000,
        actualSalePrice: 350_000,
        buyersAgentCommission: 3,
        sellersAgentCommission: 3,
        finalClosingCosts: 5_000,
        costs: [],
      } as ProjectFinancials,
      fractionalInvestors: [
        { id: 'i1', name: 'Alice', email: 'a@b.c', equityPercentage: 60, contributionAmount: 120_000, status: 'confirmed' },
        { id: 'i2', name: 'Bob',   email: 'b@b.c', equityPercentage: 40, contributionAmount: 80_000,  status: 'confirmed' },
      ],
    });
    const r = calculateEquityPayout(deal);
    expect(r.isSold).toBe(true);
    expect(r.payouts).toHaveLength(2);
    expect(r.payouts[0].equityPercentage).toBe(60);
    const total = r.payouts.reduce((s, p) => s + p.amount, 0);
    expect(total).toBeCloseTo(r.targetProfit, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. Phase 4 Directive — Cost Aggregation Integrity
//    Canonical scenario: $200k purchase · $15k closing · $65k rehab
//    $12k holding · $350k sale · $21k agent fees
// ═══════════════════════════════════════════════════════════════
describe('Phase 4 Directive — cost aggregation & ROI integrity', () => {
  /**
   * Build the canonical directive deal.
   *
   * Holding costs use the monthsPaid fallback (no createdAt / no dates)
   * so the total is always $12,000 regardless of when the test runs.
   */
  const directiveDeal = makeProject({
    createdAt: undefined as unknown as Date, // disable live-date holdDays
    financials: {
      purchasePrice:        200_000,
      estimatedARV:         350_000,
      actualSalePrice:      350_000,
      costs: [
        {
          id: 'rehab-1',
          description: 'Rehab CapEx',
          amount: 65_000,
          approved: true,
          addedBy: 'test',
          createdAt: new Date('2024-01-01'),
        },
      ],
      // Agent fees as a fixed disposition line item
      agentCommissionsFixed: 21_000,
    } as ProjectFinancials,
    costBasisLedger: {
      directAcquisition: [
        { id: 'cl-1', label: 'Closing Costs', amount: 15_000, paid: true, notes: '' },
      ],
      financing:   [],
      preClosing:  [],
    },
    holdingCosts: [
      // monthsPaid fallback: 1,000/mo × 12 = $12,000
      { id: 'hc-1', type: 'Taxes + Insurance', monthlyAmount: 1_000, monthsPaid: 12, totalMonths: 12, notes: '' },
    ],
  } as any);

  const PURCHASE      = 200_000;
  const REHAB         = 65_000;
  const ACQUISITION   = 15_000;   // buy-side closing costs via costBasisLedger
  const HOLDING       = 12_000;   // 1000 × 12 via monthsPaid
  const AGENT_FEES    = 21_000;   // agentCommissionsFixed
  const GROSS_SALE    = 350_000;
  const EXPECTED_TOTAL_COST = PURCHASE + REHAB + ACQUISITION + HOLDING + AGENT_FEES; // 313,000
  const EXPECTED_NET_PROFIT = GROSS_SALE - EXPECTED_TOTAL_COST;                       // 37,000
  const EXPECTED_NET_PROCEEDS = GROSS_SALE - AGENT_FEES;                              // 329,000

  it('total all-in cost strictly equals the sum of all five expense buckets', () => {
    const m = computeAutopsyMetrics(directiveDeal);
    expect(m.totalCostBasis).toBe(EXPECTED_TOTAL_COST); // 313,000
  });

  it('each cost bucket equals its individual input', () => {
    const m = computeAutopsyMetrics(directiveDeal);
    expect(m.purchasePrice).toBe(PURCHASE);
    expect(m.actualRehabCost).toBe(REHAB);
    expect(m.acquisitionCosts).toBe(ACQUISITION);
    expect(m.holdingCosts).toBe(HOLDING);
    expect(m.sellClosingCosts).toBe(AGENT_FEES);
  });

  it('net profit = gross sale price − total cost basis', () => {
    const m = computeAutopsyMetrics(directiveDeal);
    expect(m.netProfit).toBe(EXPECTED_NET_PROFIT); // 37,000
    expect(m.netProfit).toBe(m.grossSalePrice - m.totalCostBasis);
  });

  it('net proceeds (gross sale − disposition costs) = expected value', () => {
    const m = computeAutopsyMetrics(directiveDeal);
    const netProceeds = m.grossSalePrice - m.sellClosingCosts;
    expect(netProceeds).toBe(EXPECTED_NET_PROCEEDS); // 329,000
  });

  it('ROI = (netProfit / totalCostBasis) × 100', () => {
    const m = computeAutopsyMetrics(directiveDeal);
    const expectedRoi = (EXPECTED_NET_PROFIT / EXPECTED_TOTAL_COST) * 100;
    expect(m.roi).toBeCloseTo(expectedRoi, 6);
  });

  it('unapproved rehab costs are excluded from totalCostBasis', () => {
    const dealWithRejected = makeProject({
      createdAt: undefined as unknown as Date,
      financials: {
        purchasePrice: 200_000,
        estimatedARV: 350_000,
        actualSalePrice: 350_000,
        costs: [
          { id: 'r1', description: 'Approved',  amount: 65_000, approved: true,  addedBy: 'u', createdAt: new Date() },
          { id: 'r2', description: 'Rejected',  amount: 20_000, approved: false, addedBy: 'u', createdAt: new Date() },
        ],
      } as ProjectFinancials,
    });
    const m = computeAutopsyMetrics(dealWithRejected);
    expect(m.actualRehabCost).toBe(65_000); // 20k rejected cost must be excluded
  });

  it('handles $0 sale price without division-by-zero', () => {
    const zeroPriceDeal = makeProject({
      createdAt: undefined as unknown as Date,
      financials: {
        purchasePrice: 100_000,
        estimatedARV: 0,
        actualSalePrice: 0,
        costs: [],
      } as ProjectFinancials,
    });
    const m = computeAutopsyMetrics(zeroPriceDeal);
    // No RangeError, no NaN, no Infinity
    expect(Number.isFinite(m.roi)).toBe(true);
    expect(Number.isFinite(m.profitMargin)).toBe(true);
    // profitMargin is guarded: grossSalePrice === 0 → 0
    expect(m.profitMargin).toBe(0);
    // roi is negative (loss), but finite and defined
    expect(m.roi).toBeLessThan(0);
  });

  it('returns 0 tax liability on $0-profit deals', () => {
    const t = computeCapitalGainsTax(directiveDeal);
    // netProfit is positive here — verify tax is computed, not zero
    expect(t.estimatedTaxLiability).toBeGreaterThan(0);
    // Now verify $0 sale → no tax owed
    const lossDeal = makeProject({
      createdAt: undefined as unknown as Date,
      financials: {
        purchasePrice: 200_000,
        estimatedARV: 0,
        actualSalePrice: 0,
        costs: [],
        estimatedTimelineDays: 90,
      } as ProjectFinancials,
    });
    const tLoss = computeCapitalGainsTax(lossDeal);
    expect(tLoss.estimatedTaxLiability).toBe(0);
  });
});
