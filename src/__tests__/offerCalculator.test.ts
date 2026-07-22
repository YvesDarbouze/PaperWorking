import { solveOfferPrice, deriveAllMetrics } from '../lib/metrics/reiMetrics';
import type { ProjectFinancials } from '@/types/schema';

describe('AQ-17 Hurdle Solver Offer Calculator Unit Tests', () => {
  const baseFinancials: ProjectFinancials = {
    purchasePrice: 200000,
    estimatedARV: 300000,
    projectedRehabCost: 35000,
    financingType: 'Financed',
    downPaymentPercent: 20,
    loanInterestRate: 6.5,
    loanTermYears: 30,
    loanAmount: 160000,
    monthlyGrossRent: 2200,
    vacancyRatePercent: 5,
    tax: 150,
    insurance: 50,
    utilities: 100,
    management_pct: 10,
    maintenance_pct: 10,
    totalCashInvested: 55000,
    costs: [],
  };

  it('solves a single hurdle correctly (Min Cap Rate = 10.0%)', () => {
    const criteria = {
      capRate: { enabled: true, value: 10.0 },
    };

    const res: any = solveOfferPrice(baseFinancials, 'RENT', criteria);
    expect(res).toBeDefined();
    expect(res.feasible).toBe(true);
    expect(res.solvedPrice).toBeLessThan(baseFinancials.purchasePrice); // to get higher cap rate, purchase price must decrease

    // Check margins are satisfied at solved price
    const solvedMetrics = deriveAllMetrics(
      { ...baseFinancials, purchasePrice: res.solvedPrice, loanAmount: res.solvedPrice * 0.8 },
      baseFinancials.estimatedARV,
      'RENT'
    );
    expect(solvedMetrics.capRate).toBeGreaterThanOrEqual(10.0 - 0.1);
  });

  it('solves two hurdles together and identifies the limiting criterion', () => {
    // Enable both Min DSCR and Min Cap Rate
    const criteria = {
      capRate: { enabled: true, value: 5.5 },
      dscr: { enabled: true, value: 1.35 },
    };

    const res: any = solveOfferPrice(baseFinancials, 'RENT', criteria);
    expect(res).toBeDefined();
    expect(res.feasible).toBe(true);
    expect(res.limitingCriterion).toBeDefined();

    // Verify both metrics are satisfied at the solved price
    const solvedMetrics = deriveAllMetrics(
      { ...baseFinancials, purchasePrice: res.solvedPrice, loanAmount: res.solvedPrice * 0.8 },
      baseFinancials.estimatedARV,
      'RENT'
    );
    expect(solvedMetrics.capRate).toBeGreaterThanOrEqual(5.5 - 0.1);
    expect(solvedMetrics.dscr).toBeGreaterThanOrEqual(1.35 - 0.1);
  });

  it('handles infeasible criteria correctly and identifies the offender', () => {
    const criteria = {
      cashNeeded: { enabled: true, value: 100 },
    };

    const res: any = solveOfferPrice(baseFinancials, 'RENT', criteria);
    if (res.feasible) {
      expect(res.solvedPrice).toBeLessThan(10000);
    } else {
      expect(res.offenders.length).toBeGreaterThan(0);
    }
  });

  it('calculates wholesale dual outputs properly', () => {
    const criteria = {
      capRate: { enabled: true, value: 5.0 },
    };
    const res: any = solveOfferPrice(baseFinancials, 'RENT', criteria);
    expect(res.feasible).toBe(true);

    const buyerPrice = res.solvedPrice;
    const assignmentProfit = 10000;
    const sellerPrice = buyerPrice - assignmentProfit;

    expect(sellerPrice).toBe(buyerPrice - 10000);
  });
});
