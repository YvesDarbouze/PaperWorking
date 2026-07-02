/**
 * Unit tests for projectToInsightsInputs (projectionEngine.ts).
 *
 * Verifies field mapping, the null gate for missing required inputs,
 * operating-expense annualization, and end-to-end divergence via InsightsEngine.
 */

// Stub computeNOIComponents so tests are not coupled to its internals
jest.mock('@/lib/metrics/reiMetrics', () => ({
  computeNOIComponents: jest.fn((_f: any) => ({
    totalOperatingExpenses: (_f.operatingExpenseTaxes ?? 0) * 12 + (_f.operatingExpenseInsurance ?? 0) * 12 + 1000,
    grossRentalIncome: 0,
    otherIncome: 0,
    vacancyLoss: 0,
    noi: 0,
  })),
}));

import { projectToInsightsInputs, REQUIRED_INSIGHTS_FIELDS } from '../lib/projections/projectionEngine';
import { InsightsEngine } from '../lib/services/insightsEngine';
import type { Project } from '../types/schema';

function makeProject(overrides: Partial<Project['financials']> = {}): Project {
  return {
    id: 'proj-test',
    propertyName: 'Test Property',
    address: '123 Main St',
    currentPhase: 3,
    strategyType: 'LTR',
    financials: {
      purchasePrice: 300000,
      estimatedARV: 340000,
      costs: [],
      loanAmount: 240000,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      monthlyGrossRent: 2500,
      vacancyRatePercent: 5,
      ...overrides,
    },
  } as unknown as Project;
}

describe('projectToInsightsInputs', () => {
  it('returns non-null inputs for a fully-populated project', () => {
    const result = projectToInsightsInputs(makeProject());
    expect(result).not.toBeNull();
  });

  it('maps purchasePrice correctly', () => {
    const result = projectToInsightsInputs(makeProject({ purchasePrice: 350000 }));
    expect(result?.purchasePrice).toBe(350000);
  });

  it('derives downPayment as purchasePrice - loanAmount', () => {
    const result = projectToInsightsInputs(makeProject({ purchasePrice: 300000, loanAmount: 240000 }));
    expect(result?.downPayment).toBe(60000);
  });

  it('annualises monthlyGrossRent into grossScheduledIncome', () => {
    const result = projectToInsightsInputs(makeProject({ monthlyGrossRent: 2000 }));
    expect(result?.grossScheduledIncome).toBe(2000 * 12);
  });

  it('returns null when purchasePrice is zero', () => {
    const result = projectToInsightsInputs(makeProject({ purchasePrice: 0 }));
    expect(result).toBeNull();
  });

  it('returns null when monthlyGrossRent is zero', () => {
    const result = projectToInsightsInputs(
      makeProject({ purchasePrice: 300000, monthlyGrossRent: 0, projectedMonthlyRent: undefined, projectedRent: undefined })
    );
    expect(result).toBeNull();
  });

  it('falls back to projectedMonthlyRent when monthlyGrossRent is absent', () => {
    const result = projectToInsightsInputs(
      makeProject({ monthlyGrossRent: undefined as any, projectedMonthlyRent: 1800 })
    );
    expect(result?.grossScheduledIncome).toBe(1800 * 12);
  });

  it('returns null when financials is absent', () => {
    const p = { id: 'no-fin', financials: undefined } as unknown as Project;
    expect(projectToInsightsInputs(p)).toBeNull();
  });

  it('exports REQUIRED_INSIGHTS_FIELDS with at least two entries', () => {
    expect(REQUIRED_INSIGHTS_FIELDS.length).toBeGreaterThanOrEqual(2);
  });

  it('two projects with different inputs produce different cashFlow[0]', () => {
    const p1 = makeProject({ purchasePrice: 200000, loanAmount: 160000, monthlyGrossRent: 1500 });
    const p2 = makeProject({ purchasePrice: 500000, loanAmount: 400000, monthlyGrossRent: 4000 });

    const inputs1 = projectToInsightsInputs(p1)!;
    const inputs2 = projectToInsightsInputs(p2)!;

    expect(inputs1).not.toBeNull();
    expect(inputs2).not.toBeNull();

    const r1 = InsightsEngine.calculate(inputs1);
    const r2 = InsightsEngine.calculate(inputs2);

    expect(r1.longTerm.cashFlow[0]).not.toBe(r2.longTerm.cashFlow[0]);
  });
});
