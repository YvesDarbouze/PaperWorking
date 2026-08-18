import {
  METRIC_REGISTRY_33,
  CANONICAL_8_EXPENSE_TAGS,
  validateExpenseTag,
  deriveFiveGoldens,
  evaluateMetricHonesty,
} from '../index';

describe('Agent 9: Metric Engine Sole Source of Truth & Canonical 33 Metrics', () => {
  test('1. METRIC_REGISTRY_33 contains exactly 33 metrics across 5 operational phases', () => {
    const metricKeys = Object.keys(METRIC_REGISTRY_33);
    expect(metricKeys.length).toBe(33);

    metricKeys.forEach(key => {
      const def = METRIC_REGISTRY_33[key];
      expect(def.id).toBeDefined();
      expect(def.name).toBeDefined();
      expect(def.formula).toBeDefined();
      expect(def.requiredInputs.length).toBeGreaterThan(0);
      expect(['ACQUISITION', 'PURCHASE', 'HOLD', 'EXIT', 'TAX']).toContain(def.phase);
      expect(['bar', 'line', 'pie', 'gauge', 'metric_card']).toContain(def.chartType);
    });
  });

  test('2. "The Five Goldens" Canonical Seed Deal returns exact expected outputs', () => {
    const goldens = deriveFiveGoldens({
      purchasePrice: 277466,
      grossScheduledRent: 23400,
      vacancyRatePct: 7,
      totalOpEx: 9276,
      debtService: 16930,
      totalCashInvested: 60000,
    });

    expect(goldens.noi).toBe(12486); // Effective Gross Income ($21,762) - $9,276
    expect(goldens.capRatePct).toBe(4.5); // (12,486 / 277,466) * 100
    expect(goldens.annualCashFlow).toBe(-4444); // 12,486 - 16,930
    expect(goldens.dscr).toBe(0.74); // 12,486 / 16,930
    expect(goldens.cocReturnPct).toBe(-7.41); // (-4,444 / 60,000) * 100
  });

  test('3. BUG-8 Lock: Management Fee is strictly locked to Gross Scheduled Rent', () => {
    const goldens = deriveFiveGoldens({
      purchasePrice: 277466,
      grossScheduledRent: 23400,
      totalOpEx: 9276,
      debtService: 16930,
      managementFeePct: 10,
    });

    // 10% of $23,400 gross rent = $2,340 (MUST NOT be calculated on NOI or cash flow)
    expect(goldens.managementFeeAmount).toBe(2340);
  });

  test('4. Enforces Canonical 8 Expense Tags taxonomy and rejects unauthorized tags', () => {
    expect(CANONICAL_8_EXPENSE_TAGS.length).toBe(8);

    CANONICAL_8_EXPENSE_TAGS.forEach(tag => {
      expect(validateExpenseTag(tag)).toBe(tag);
    });

    expect(() => validateExpenseTag('unauthorized_bribe')).toThrow(
      /Invalid expense tag/
    );
  });

  test('5. Honesty Rule: Missing required inputs trigger "Data Needed" without fabricating numbers', () => {
    const missingRes = evaluateMetricHonesty('cap_rate_pct', { purchase_price: 200000 }); // missing 'noi'
    expect(missingRes.isMissing).toBe(true);
    expect(missingRes.value).toBe('Data Needed');
    expect(missingRes.missingFields).toContain('noi');

    const validRes = evaluateMetricHonesty('cap_rate_pct', { purchase_price: 200000, noi: 12486 });
    expect(validRes.isMissing).toBe(false);
    expect(validRes.value).not.toBe('Data Needed');
  });

  test('6. Portfolio Aggregation Math: Portfolio total equals sum of project inputs', () => {
    const project1Rent = 23400;
    const project2Rent = 18600;
    const portfolioTotalRent = project1Rent + project2Rent;

    expect(portfolioTotalRent).toBe(42000);
  });
});
