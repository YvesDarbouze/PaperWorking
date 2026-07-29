import {
  generateTaxWorksheet1040ES,
  generateQuarterlyBudgetVsActuals,
  TAX_DISCLAIMER,
} from '@/lib/reports/reportEngine';
import { calculateVariance } from '@/lib/operations/variance';

describe('RP-2 Quarterly Reports Engine Unit & Integration Tests', () => {
  const sampleProjects = [
    {
      id: 'p1',
      name: 'Evergreen Terrace',
      propertyName: 'Evergreen Terrace',
      strategy: 'LTR', // Passive
      financials: {
        monthlyGrossRent: 3000,
        holdingCostUtilities: 100,
        monthlyMaintenanceReserve: 150,
        holdingCostTaxes: 250,
        holdingCostInsurance: 80,
      },
      budgetBaseline: {
        monthlyGrossRent: 2800,
        monthlyExpenses: 500,
        monthlyNoi: 2300,
        monthlyMaintenanceReserve: 140,
      },
    },
    {
      id: 'p2',
      name: 'Beachfront Villa',
      propertyName: 'Beachfront Villa',
      strategy: 'STR', // Active
      financials: {
        monthlyGrossRent: 8000,
        holdingCostUtilities: 400,
        monthlyMaintenanceReserve: 350,
        holdingCostTaxes: 600,
        holdingCostInsurance: 200,
      },
      budgetBaseline: {
        monthlyGrossRent: 7500,
        monthlyExpenses: 1400,
        monthlyNoi: 6100,
        monthlyMaintenanceReserve: 300,
      },
    },
  ];

  it('1. 1040-ES worksheet computes estimated quarterly payment and renders mandatory disclaimer', () => {
    const tax = generateTaxWorksheet1040ES(sampleProjects, { scope: 'portfolio', period: 'Quarterly' }, 25);

    expect(tax.title).toBe('1040-ES Quarterly Estimated Tax Worksheet');
    expect(tax.disclaimer).toBe(TAX_DISCLAIMER);
    expect(tax.disclaimer).toBe('Estimate worksheet — confirm with your CPA');

    // Quarterly Net Income: Q1-Q3 YTD basis
    // p1 monthly NOI = 3000 - (100+150+250+80=580) = 2420 * 3 = 7260
    // p2 monthly NOI = 8000 - (400+350+600+200=1550) = 6450 * 3 = 19350
    // YTD Portfolio Net Income = 7260 + 19350 = 26610
    expect(tax.ytdPortfolioNetIncome).toBe(26610);
    expect(tax.annualizedNetIncome).toBe(26610 * 4); // 106440

    // Tax Liability at 25% = 106440 * 0.25 = 26610
    expect(tax.annualTaxLiability).toBe(26610);
    expect(tax.estimatedQuarterlyPayment).toBe(Math.round(26610 / 4)); // 6653

    // Active vs Passive income classification assertion
    const p1 = tax.properties.find(p => p.projectId === 'p1');
    const p2 = tax.properties.find(p => p.projectId === 'p2');

    expect(p1?.activityType).toBe('Passive');
    expect(p2?.activityType).toBe('Active');
  });

  it('2. Budget vs Actuals output is IDENTICAL to variance-engine output for same inputs (shared-function test)', () => {
    const bva = generateQuarterlyBudgetVsActuals(sampleProjects, { scope: 'portfolio', period: 'Quarterly' });

    expect(bva.title).toBe('Quarterly Budget vs. Actuals Variance Report');

    // Directly call calculateVariance from variance.ts with identical inputs
    const p1ActualRent = 3000 * 3;
    const p1BaselineRent = 2800 * 3;
    const directP1Variance = calculateVariance(p1ActualRent, p1BaselineRent);

    const reportP1Variance = bva.properties.find(p => p.projectId === 'p1')?.grossRent;

    // Assert identity
    expect(reportP1Variance).toEqual(directP1Variance);
    expect(reportP1Variance?.varianceAmount).toBe(directP1Variance.varianceAmount);
    expect(reportP1Variance?.variancePercent).toBe(directP1Variance.variancePercent);
    expect(reportP1Variance?.status).toBe(directP1Variance.status);
  });
});
