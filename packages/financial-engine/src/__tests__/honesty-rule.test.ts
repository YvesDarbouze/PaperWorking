import { describe, expect, it } from '@jest/globals';
import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics.js';

describe('Honesty Rule — missing inputs produce null KPIs', () => {
  it('returns null LTV and equity-to-value when loan amount is absent', async () => {
    const result = await deriveAllProjectMetrics('no-loan', {
      mockData: {
        purchase_price: 400_000,
        property_value: 400_000,
        gross_scheduled_rent: 42_000,
        vacancy_rate: 5,
        operating_expenses: { tax: 4_800, insurance: 1_200 },
      },
    });

    expect(result.insights.financial.ltv.value).toBeNull();
    expect(result.insights.financial.equityToValue.value).toBeNull();
  });

  it('returns null IRR without stored cash-flow events', async () => {
    const result = await deriveAllProjectMetrics('no-irr', {
      mockData: {
        purchase_price: 400_000,
        property_value: 400_000,
        gross_scheduled_rent: 42_000,
        total_cash_invested: 88_000,
        vacancy_rate: 5,
        operating_expenses: { tax: 4_800 },
      },
    });

    expect(result.scorecard.irr.value).toBeNull();
    expect(result.scorecard.irr.missingInputs).toContain('cash_flow_events');
  });

  it('returns null compliance rate when checklist is absent', async () => {
    const result = await deriveAllProjectMetrics('no-compliance', {
      mockData: {
        purchase_price: 400_000,
        gross_scheduled_rent: 42_000,
        operating_expenses: { tax: 4_800 },
      },
    });

    expect(result.insights.riskCompliance.complianceRate.value).toBeNull();
  });

  it('returns null NOI when rent is missing', async () => {
    const result = await deriveAllProjectMetrics('no-rent', {
      mockData: {
        purchase_price: 400_000,
        operating_expenses: { tax: 4_800 },
      },
    });

    expect(result.scorecard.noi.value).toBeNull();
    expect(result.scorecard.capRate.value).toBeNull();
  });

  it('returns null Risk Assessment when fewer than four category scores exist', async () => {
    const result = await deriveAllProjectMetrics('risk-partial', {
      mockData: {
        purchase_price: 400_000,
        financial_risk_score: 8,
        market_risk_score: 6,
        operational_risk_score: 4,
      },
    });

    expect(result.insights.riskCompliance.riskAssessmentScore.value).toBeNull();
  });

  it('uses stored four-category risk scores when all present', async () => {
    const result = await deriveAllProjectMetrics('risk-scores', {
      mockData: {
        purchase_price: 400_000,
        financial_risk_score: 8,
        market_risk_score: 6,
        operational_risk_score: 4,
        compliance_risk_score: 2,
      },
    });

    expect(result.insights.riskCompliance.riskAssessmentScore.value).toBe(5);
  });
});
