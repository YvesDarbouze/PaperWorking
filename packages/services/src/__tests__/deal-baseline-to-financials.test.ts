import { describe, expect, it } from '@jest/globals';
import { dealBaselineToFinancials } from '../projects/deal-baseline-to-financials.js';

describe('dealBaselineToFinancials', () => {
  it('maps deal underwriting fields into project.financials', () => {
    const financials = dealBaselineToFinancials({
      purchasePrice: 485000,
      rehabCost: 68000,
      arv: 620000,
      projectedMonthlyRent: 3800,
    });

    expect(financials.purchasePrice).toBe(485000);
    expect(financials.projectedRehabCost).toBe(68000);
    expect(financials.projectedSalePrice).toBe(620000);
    expect(financials.monthlyGrossRent).toBe(3800);
    expect(financials.potentialRentalIncomeMonthly).toBe(3800);
  });

  it('merges with existing financials without dropping prior keys', () => {
    const financials = dealBaselineToFinancials(
      { projectedMonthlyRent: 2500 },
      { loanAmount: 300000, operatingExpenseTaxes: 4200 },
    );

    expect(financials.loanAmount).toBe(300000);
    expect(financials.operatingExpenseTaxes).toBe(4200);
    expect(financials.monthlyGrossRent).toBe(2500);
  });
});
