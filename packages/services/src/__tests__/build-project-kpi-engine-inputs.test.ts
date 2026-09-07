import { describe, expect, it } from '@jest/globals';
import { buildProjectKpiEngineInputs } from '../projects/build-project-kpi-engine-inputs.js';
import { deriveAllProjectMetrics } from '@paperworking/financial-engine';

describe('buildProjectKpiEngineInputs', () => {
  it('maps top-level financials.rent and opex into engine inputs', () => {
    const inputs = buildProjectKpiEngineInputs({
      id: 'p1',
      purchasePrice: 400_000,
      financials: {
        monthlyGrossRent: 3_500,
        vacancyRatePercent: 5,
        operatingExpenseTaxes: 4_800,
        operatingExpenseInsurance: 1_200,
        propertyManagementFee: 3_360,
        loanAmount: 312_000,
        loanInterestRate: 6.5,
        loanTermYears: 30,
        totalCashInvested: 88_000,
        numberOfUnits: 4,
        occupiedUnits: 3,
      },
    });

    expect(inputs.gross_scheduled_rent).toBe(42_000);
    expect(inputs.vacancy_rate).toBe(5);
    expect(inputs.operating_expenses).toEqual({
      tax: 4_800,
      insurance: 1_200,
      management: 3_360,
    });
    expect(inputs.loan_amount).toBe(312_000);
    expect(inputs.interest_rate).toBeCloseTo(0.065);
    expect(inputs.loan_term_years).toBe(30);
    expect(inputs.total_cash_invested).toBe(88_000);
    expect(inputs.total_units).toBe(4);
    expect(inputs.occupied_units).toBe(3);
  });

  it('derives NOI from financials through the financial engine', async () => {
    const engineInputs = buildProjectKpiEngineInputs({
      id: 'p-rent',
      purchasePrice: 400_000,
      financials: {
        monthlyGrossRent: 3_500,
        vacancyRatePercent: 5,
        operatingExpenseTaxes: 4_800,
        operatingExpenseInsurance: 1_200,
        loanAmount: 312_000,
        loanInterestRate: 6.5,
        loanTermYears: 30,
        totalCashInvested: 88_000,
      },
    });

    const metrics = await deriveAllProjectMetrics('p-rent', { mockData: engineInputs });
    expect(metrics.scorecard.noi.value).not.toBeNull();
    expect(metrics.scorecard.noi.value).toBeGreaterThan(0);
    expect(metrics.scorecard.capRate.value).not.toBeNull();
  });

  it('reads nested phaseData.hold financial fields', () => {
    const inputs = buildProjectKpiEngineInputs({
      id: 'p2',
      purchasePrice: 250_000,
      phaseData: {
        hold: {
          monthlyGrossRent: 2_000,
          operatingExpenseTaxes: 2_400,
        },
      },
    });

    expect(inputs.gross_scheduled_rent).toBe(24_000);
    expect((inputs.operating_expenses as Record<string, number>).tax).toBe(2_400);
  });

  it('prefers explicit flat phaseData keys over financials', () => {
    const inputs = buildProjectKpiEngineInputs({
      id: 'p3',
      purchasePrice: 300_000,
      phaseData: { gross_scheduled_rent: 50_000 },
      financials: { monthlyGrossRent: 2_000 },
    });

    expect(inputs.gross_scheduled_rent).toBe(50_000);
  });

  it('returns purchase-only fields without fabricated loan assumptions', () => {
    const inputs = buildProjectKpiEngineInputs({
      id: 'p4',
      purchasePrice: 500_000,
    });

    expect(inputs.purchase_price).toBe(500_000);
    expect(inputs.total_cash_invested).toBeUndefined();
    expect(inputs.loan_amount).toBeUndefined();
    expect(inputs.gross_scheduled_rent).toBeUndefined();
  });

  it('maps squareFootage from project and financials', () => {
    const inputs = buildProjectKpiEngineInputs({
      id: 'p5',
      purchasePrice: 300_000,
      squareFootage: 1800,
      financials: {
        monthlyGrossRent: 2500,
      },
    });

    expect(inputs.total_sqft).toBe(1800);
  });
});
