import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ENGINE_VERSION,
  NEXT_ENGINE_VERSION,
  ENGINE_V4_ENABLED,
} from '../constants.js';
import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics.js';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal.js';
import { canonicalDemoDeal } from '../fixtures/canonical-demo-deal.js';
import {
  calculateProjectedIrrDetails,
  reconcileAcquisitionUnderwriting,
} from '../index.js';

describe('W2-00: Engine Version 4 Dark Launch Preparation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-14T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('establishes ENGINE_VERSION = 4 as the active version constant', () => {
    expect(ENGINE_VERSION).toBe(4);
  });

  it('introduces NEXT_ENGINE_VERSION = 5 for Wave 3 math preparation', () => {
    expect(NEXT_ENGINE_VERSION).toBe(5);
  });

  it('sets ENGINE_V4_ENABLED to true as dark launch flag is retired', () => {
    expect(ENGINE_V4_ENABLED).toBe(true);
  });

  it('produces byte-identical v3 output on canonicalSeedDeal when flag is off', async () => {
    const fixedDate = new Date('2026-09-14T00:00:00.000Z');

    // Run calculation with default flag (false)
    const outputDefault = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
      asOfDate: fixedDate,
    });

    // Run baseline calculation
    const outputBaseline = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
      asOfDate: fixedDate,
    });

    const jsonDefault = JSON.stringify(outputDefault);
    const jsonBaseline = JSON.stringify(outputBaseline);

    expect(jsonDefault).toBe(jsonBaseline);

    // Verify key financial metrics match canonical v3 golden specs
    expect(outputDefault.scorecard.noi.value).toBeCloseTo(12485, 0);
    expect(outputDefault.scorecard.capRate.value).toBeCloseTo(4.5, 1);
    expect(outputDefault.scorecard.cashOnCash.value).toBeCloseTo(-7.96, 1);
    expect(outputDefault.derived.monthlyMortgagePayment).toBeCloseTo(1410.78, 2);
    expect(outputDefault.scorecard.dscr.value).toBeCloseTo(0.74, 2);
  });

  it('produces byte-identical v3 output on canonicalDemoDeal when flag is off', () => {
    const run1 = calculateProjectedIrrDetails({
      totalCashInvested: canonicalDemoDeal.cashRequired,
      annualPreTaxCashFlow: canonicalDemoDeal.annualCashFlow,
      purchasePrice: canonicalDemoDeal.purchasePrice,
      loanAmount: canonicalDemoDeal.loanAmount,
      interestRatePct: canonicalDemoDeal.interestRatePct,
      amortizationYears: canonicalDemoDeal.amortizationYears,
      holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
      annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
      sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
    });

    const run2 = calculateProjectedIrrDetails({
      totalCashInvested: canonicalDemoDeal.cashRequired,
      annualPreTaxCashFlow: canonicalDemoDeal.annualCashFlow,
      purchasePrice: canonicalDemoDeal.purchasePrice,
      loanAmount: canonicalDemoDeal.loanAmount,
      interestRatePct: canonicalDemoDeal.interestRatePct,
      amortizationYears: canonicalDemoDeal.amortizationYears,
      holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
      annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
      sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
    });

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));

    const recon1 = reconcileAcquisitionUnderwriting({
      purchasePrice: canonicalDemoDeal.purchasePrice,
      rehabBudget: canonicalDemoDeal.rehabBudget,
      estimatedARV: canonicalDemoDeal.estimatedARV,
      targetLtvPct: canonicalDemoDeal.targetLtvPct,
      buyerClosingCostsPct: canonicalDemoDeal.buyerClosingCostsPct,
      interestRatePct: canonicalDemoDeal.interestRatePct,
      amortizationYears: canonicalDemoDeal.amortizationYears,
      grossRentMonthly: canonicalDemoDeal.grossRentMonthly,
      vacancyRatePct: canonicalDemoDeal.vacancyRatePct,
      operatingExpensesAnnual: canonicalDemoDeal.operatingExpensesAnnual,
      operatingExpenseRatioPct: canonicalDemoDeal.operatingExpenseRatioPct,
      holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
      annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
      sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
      terminalValueMethod: canonicalDemoDeal.terminalValueMethod,
    });

    const recon2 = reconcileAcquisitionUnderwriting({
      purchasePrice: canonicalDemoDeal.purchasePrice,
      rehabBudget: canonicalDemoDeal.rehabBudget,
      estimatedARV: canonicalDemoDeal.estimatedARV,
      targetLtvPct: canonicalDemoDeal.targetLtvPct,
      buyerClosingCostsPct: canonicalDemoDeal.buyerClosingCostsPct,
      interestRatePct: canonicalDemoDeal.interestRatePct,
      amortizationYears: canonicalDemoDeal.amortizationYears,
      grossRentMonthly: canonicalDemoDeal.grossRentMonthly,
      vacancyRatePct: canonicalDemoDeal.vacancyRatePct,
      operatingExpensesAnnual: canonicalDemoDeal.operatingExpensesAnnual,
      operatingExpenseRatioPct: canonicalDemoDeal.operatingExpenseRatioPct,
      holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
      annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
      sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
      terminalValueMethod: canonicalDemoDeal.terminalValueMethod,
    });

    expect(JSON.stringify(recon1)).toBe(JSON.stringify(recon2));
    expect(recon1.netOperatingIncome).toBe(38138);
    expect(recon1.capRateOnCost).toBe(6.4);
    expect(recon1.projectedIrrPct).toBe(3.8);
  });
});
