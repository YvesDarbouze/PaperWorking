import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics';

describe('Audit Suite 3: Honesty Rule Validation — Missing Inputs', () => {
  test('NOI with missing gross_scheduled_rent shows null + missing input', async () => {
    const incompleteDeal = {
      purchase_price: 279000,
      gross_scheduled_rent: null, // missing!
      vacancy_rate: 0.03,
      operating_expenses: 11880,
    };

    const result = await deriveAllProjectMetrics('test-missing-rent', { mockData: incompleteDeal });

    expect(result.scorecard.noi.value).toBeNull();
    expect(result.scorecard.noi.missingInputs).toContain('gross_scheduled_rent');
    expect(result.scorecard.noi.sourceCardId).toBe('card_income');
  });

  test('Cap Rate with missing purchase_price shows null', async () => {
    const incompleteDeal = {
      purchase_price: null, // missing!
      gross_scheduled_rent: 28800,
      vacancy_rate: 0.03,
      operating_expenses: 11880,
    };

    const result = await deriveAllProjectMetrics('test-missing-price', { mockData: incompleteDeal });

    expect(result.scorecard.capRate.value).toBeNull();
    expect(result.scorecard.capRate.missingInputs).toContain('purchase_price');
  });

  test('NO metric shows placeholder values ("0" or "N/A") when inputs are missing', async () => {
    const incompleteDeal = {
      purchase_price: 279000,
      // all other fields missing
    };

    const result = await deriveAllProjectMetrics('test-incomplete-50pct', { mockData: incompleteDeal });

    const allMetrics = [
      ...Object.values(result.scorecard),
      ...Object.values(result.insights.financial),
      ...Object.values(result.insights.operational),
      ...Object.values(result.insights.assetPortfolio),
      ...Object.values(result.insights.marketingSales),
      ...Object.values(result.insights.riskCompliance),
    ];

    for (const metric of allMetrics as any[]) {
      if (metric.missingInputs && metric.missingInputs.length > 0) {
        expect(metric.value).toBeNull();
        expect(metric.projected).toBe(true);
      }
    }
  });
});
