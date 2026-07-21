import { computeTotalCashInvested } from '../lib/metrics/reiMetrics';
import { ProjectFinancials } from '../types/schema';

describe('Total Cash Invested Assembly & Math Validation', () => {
  it('should assemble from downPayment + closingCosts + upfrontRehab', () => {
    const fin: ProjectFinancials = {
      purchasePrice: 200000_00, // $200k in cents
      estimatedARV: 200000_00,
      loanAmount: 160000_00,    // $160k in cents
      targetClosingCosts: 5000_00, // $5k projected closing costs
      upfrontRehab: 15000_00,   // $15k upfront rehab
      costs: []
    };

    // Down payment = 200,000 - 160,000 = 40,000
    // Total cash invested = 40,000 + 5,000 + 15,000 = 60,000 in cents ($60k)
    const totalCash = computeTotalCashInvested(fin);
    expect(totalCash).toBe(60000_00);
  });

  it('should fallback to purchasePrice for All Cash deals', () => {
    const fin: ProjectFinancials = {
      purchasePrice: 200000_00,
      estimatedARV: 200000_00,
      financingType: 'All Cash',
      loanAmount: 160000_00, // ignored for All Cash
      targetClosingCosts: 5000_00,
      upfrontRehab: 15000_00,
      costs: []
    };

    // Down payment = 200,000 (All Cash)
    // Total cash invested = 200,000 + 5,000 + 15,000 = 220,000 in cents
    const totalCash = computeTotalCashInvested(fin);
    expect(totalCash).toBe(220000_00);
  });

  it('should fallback to actual closing costs if set', () => {
    const fin: ProjectFinancials = {
      purchasePrice: 200000_00,
      estimatedARV: 200000_00,
      loanAmount: 160000_00,
      closingCosts: 3500_00, // actual closing costs
      targetClosingCosts: 5000_00, // ignored because actual is set
      upfrontRehab: 15000_00,
      costs: []
    };

    // Down payment = 40,000
    // Total cash invested = 40,000 + 3,500 + 15,000 = 58,500 in cents
    const totalCash = computeTotalCashInvested(fin);
    expect(totalCash).toBe(58500_00);
  });

  it('should infer closingCosts from totalCashInvested for legacy data compatibility', () => {
    const fin: ProjectFinancials = {
      purchasePrice: 279000_00,
      estimatedARV: 320000_00,
      loanAmount: 223200_00,
      totalCashInvested: 60000_00, // legacy totals field
      costs: []
    };

    // Down payment = 279,000 - 223,200 = 55,800
    // inferred closing costs = 60,000 - 55,800 = 4,200
    // Total Cash Invested must match 60,000
    const totalCash = computeTotalCashInvested(fin);
    expect(totalCash).toBe(60000_00);
  });
});
