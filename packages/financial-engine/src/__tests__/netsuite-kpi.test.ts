import { describe, expect, it } from '@jest/globals';
import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics.js';

const NETSUITE_EXAMPLE = {
  gross_scheduled_rent: 120_000,
  other_income: 10_000,
  operating_expenses: {
    tax: 30_000,
    insurance: 0,
    security: 0,
    maintenance: 0,
    utilities: 0,
    management: 0,
    HOA: 0,
  },
  loan_amount: 200_000,
  interest_rate: 0.06,
  loan_term_years: 30,
  ppe_previous_year: 80_000,
  ppe_current_year: 90_000,
  depreciation_current_year: 5_000,
  financial_risk_score: 8,
  market_risk_score: 6,
  operational_risk_score: 4,
  compliance_risk_score: 2,
};

describe('NetSuite KPI definitions', () => {
  it('GOI = Potential Rental Income + Other Income (no vacancy deduction)', async () => {
    const result = await deriveAllProjectMetrics('ns-goi', {
      mockData: {
        gross_scheduled_rent: 120_000,
        other_income: 10_000,
        vacancy_rate: 10,
        operating_expenses: { tax: 1 },
      },
    });
    expect(result.insights.financial.goi.value).toBe(130_000);
  });

  it('NOI = GOI − Operating Expenses (excludes debt and CapEx)', async () => {
    const result = await deriveAllProjectMetrics('ns-noi', { mockData: NETSUITE_EXAMPLE });
    expect(result.insights.financial.goi.value).toBe(130_000);
    expect(result.scorecard.noi.value).toBe(100_000);
  });

  it('CapEx = PP&E current − PP&E previous + Depreciation', async () => {
    const result = await deriveAllProjectMetrics('ns-capex', { mockData: NETSUITE_EXAMPLE });
    expect(result.insights.financial.capex.value).toBe(15_000);
  });

  it('Cash Flow = Total Income − Total Expenses (OpEx + debt + CapEx)', async () => {
    const result = await deriveAllProjectMetrics('ns-cf', { mockData: NETSUITE_EXAMPLE });
    const debtService = result.derived.totalDebtService as number;
    expect(debtService).toBeGreaterThan(0);
    const expected =
      130_000 - 30_000 - debtService - 15_000;
    expect(result.scorecard.cashFlow.value).toBeCloseTo(expected, 0);
  });

  it('Risk Assessment = average of four stored category scores', async () => {
    const result = await deriveAllProjectMetrics('ns-risk', { mockData: NETSUITE_EXAMPLE });
    expect(result.insights.riskCompliance.riskAssessmentScore.value).toBe(5);
  });

  it('returns N/A Risk Assessment when a category score is missing', async () => {
    const result = await deriveAllProjectMetrics('ns-risk-missing', {
      mockData: {
        ...NETSUITE_EXAMPLE,
        compliance_risk_score: undefined,
      },
    });
    expect(result.insights.riskCompliance.riskAssessmentScore.value).toBeNull();
  });

  it('returns N/A CapEx when PP&E inputs are missing', async () => {
    const result = await deriveAllProjectMetrics('ns-capex-missing', {
      mockData: {
        gross_scheduled_rent: 120_000,
        operating_expenses: { tax: 30_000 },
      },
    });
    expect(result.insights.financial.capex.value).toBeNull();
  });

  it('returns N/A Cash Flow when CapEx inputs are missing', async () => {
    const result = await deriveAllProjectMetrics('ns-cf-missing-capex', {
      mockData: {
        gross_scheduled_rent: 120_000,
        operating_expenses: { tax: 30_000 },
        loan_amount: 0,
      },
    });
    expect(result.scorecard.cashFlow.value).toBeNull();
  });

  it('does not subtract debt service inside NOI', async () => {
    const withDebt = await deriveAllProjectMetrics('ns-noi-debt', { mockData: NETSUITE_EXAMPLE });
    const withoutDebt = await deriveAllProjectMetrics('ns-noi-nodebt', {
      mockData: {
        ...NETSUITE_EXAMPLE,
        loan_amount: 0,
      },
    });
    expect(withDebt.scorecard.noi.value).toBe(withoutDebt.scorecard.noi.value);
  });
});
