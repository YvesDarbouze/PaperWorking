import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics';
import { canonicalSeedDeal, expectedGoldenValues } from '../fixtures/canonical-seed-deal';
import { edgeCaseScenarios } from '../fixtures/test-scenarios';

describe('Agent 4: deriveAllProjectMetrics (33-Metric Engine Core)', () => {
  test('Computes Golden Values matching canonical seed deal spec exactly', async () => {
    const res = await deriveAllProjectMetrics('proj_golden_seed_1', {
      mockData: canonicalSeedDeal,
    });

    expect(res.projectId).toBe('proj_golden_seed_1');

    // 10 Scorecard Golden Values
    expect(res.derived.monthlyMortgagePayment).toBe(expectedGoldenValues.monthlyMortgagePayment);
    expect(res.derived.totalDebtService).toBe(expectedGoldenValues.totalDebtService);
    expect(res.scorecard.noi.value).toBe(expectedGoldenValues.noi);
    expect(res.scorecard.capRate.value).toBe(expectedGoldenValues.capRatePct);
    expect(res.scorecard.cashFlow.value).toBe(expectedGoldenValues.cashFlow);
    expect(res.scorecard.cashOnCash.value).toBe(expectedGoldenValues.cashOnCashPct);
    expect(res.scorecard.dscr.value).toBe(expectedGoldenValues.dscr);
    expect(res.scorecard.grm.value).toBe(expectedGoldenValues.grm);
    expect(res.scorecard.occupancyRate.value).toBe(expectedGoldenValues.occupancyRatePct);
    expect(res.scorecard.expenseRatio.value).toBe(expectedGoldenValues.expenseRatioPct);

    // 24 Insights Metrics verification
    expect(res.insights.financial.ltv.value).toBe(expectedGoldenValues.ltvPct);
    expect(res.insights.financial.equityToValue.value).toBe(expectedGoldenValues.equityToValuePct);
    expect(res.insights.financial.goi.value).toBe(expectedGoldenValues.goi);
    expect(res.insights.riskCompliance.riskAssessmentScore.value).toBeGreaterThan(0);
    expect(res.insights.riskCompliance.complianceRate.value).toBe(100);
  });

  test('Honesty Rule: Returns value = null with missingInputs and sourceCardId deep-link when inputs are missing', async () => {
    const incompleteDeal = {
      ...canonicalSeedDeal,
      purchase_price: undefined,
      gross_scheduled_rent: undefined,
    };

    const res = await deriveAllProjectMetrics('proj_incomplete_1', {
      mockData: incompleteDeal,
    });

    expect(res.scorecard.noi.value).toBeNull();
    expect(res.scorecard.noi.missingInputs).toContain('gross_scheduled_rent');
    expect(res.scorecard.noi.sourceCardId).toBe('card_income');

    expect(res.scorecard.capRate.value).toBeNull();
    expect(res.scorecard.capRate.missingInputs).toContain('purchase_price');
    expect(res.scorecard.capRate.sourceCardId).toBe('card_acquisition');
  });

  test('Edge Case: Zero Rent', async () => {
    const res = await deriveAllProjectMetrics('proj_zero_rent', {
      mockData: edgeCaseScenarios.zeroRent,
    });

    expect(res.scorecard.grm.value).toBeNull();
    expect(res.insights.financial.goi.value).toBe(0);
    expect(res.scorecard.cashFlow.value).toBeLessThan(0);
  });

  test('Edge Case: 100% Vacancy', async () => {
    const res = await deriveAllProjectMetrics('proj_full_vacancy', {
      mockData: edgeCaseScenarios.fullVacancy,
    });

    expect(res.insights.financial.goi.value).toBe(0);
    expect(res.scorecard.noi.value).toBeLessThan(0);
  });

  test('Edge Case: All-Cash Purchase ($0 Loan Amount)', async () => {
    const res = await deriveAllProjectMetrics('proj_all_cash', {
      mockData: edgeCaseScenarios.allCash,
    });

    expect(res.derived.monthlyMortgagePayment).toBe(0);
    expect(res.derived.totalDebtService).toBe(0);
    expect(res.insights.financial.ltv.value).toBe(0);
    expect(res.insights.financial.equityToValue.value).toBe(100);
    expect(res.scorecard.dscr.value).toBeNull(); // DSCR on all-cash is n/a
  });

  test('Projected vs Actual State Transitions', async () => {
    const projectedRes = await deriveAllProjectMetrics('proj_test', {
      mockData: canonicalSeedDeal,
      includeProjected: true,
    });

    expect(projectedRes.scorecard.noi.projected).toBe(true);

    const actualRes = await deriveAllProjectMetrics('proj_test', {
      mockData: canonicalSeedDeal,
      includeProjected: false,
    });

    expect(actualRes.scorecard.noi.projected).toBe(false);
  });
});
