import { calculateRentalDeal, RentalDealInputs } from '../lib/deal-analyzer/calcEngine';

describe('Deal Analyzer — NOI Consistency Audit Test', () => {
  it('asserts that capRate NOI strictly equals cashFlow NOI in calculateRentalDeal', () => {
    const inputs: RentalDealInputs = {
      purchasePrice: 250000,
      monthlyRent: 2500,
      vacancyRate: 5,
      propertyTaxesAnnual: 3200,
      insuranceAnnual: 1250,
      repairsPercent: 5,
      capexPercent: 5,
      propertyMgmtPercent: 10,
      downPaymentPercent: 25,
      interestRate: 6.5,
      loanTermYears: 30,
      closingCostsPercent: 3,
    };

    const results = calculateRentalDeal(inputs);

    // 1. Direct NOI from calcEngine
    const engineNOI = results.noi;

    // 2. Implied NOI from Cap Rate: (capRate / 100) * purchasePrice
    const impliedCapRateNOI = (results.capRate / 100) * inputs.purchasePrice;

    // 3. Implied NOI from Cash Flow: annualCashFlow + annualDebtService
    const impliedCashFlowNOI = results.annualCashFlow + results.annualDebtService;

    // Assert strictly equal (within 0.01 floating point precision)
    expect(impliedCapRateNOI).toBeCloseTo(engineNOI, 2);
    expect(impliedCashFlowNOI).toBeCloseTo(engineNOI, 2);
    expect(impliedCapRateNOI).toBeCloseTo(impliedCashFlowNOI, 2);
  });

  it('asserts NOI consistency across custom expense inputs and quickExpenseMode', () => {
    const inputs: RentalDealInputs = {
      purchasePrice: 400000,
      monthlyRent: 4000,
      quickExpenseMode: true,
      downPaymentPercent: 20,
      interestRate: 7.0,
      loanTermYears: 30,
    };

    const results = calculateRentalDeal(inputs);

    const impliedCapRateNOI = (results.capRate / 100) * inputs.purchasePrice;
    const impliedCashFlowNOI = results.annualCashFlow + results.annualDebtService;

    expect(impliedCapRateNOI).toBeCloseTo(results.noi, 2);
    expect(impliedCashFlowNOI).toBeCloseTo(results.noi, 2);
  });
});
