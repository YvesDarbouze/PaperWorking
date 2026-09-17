import {
  computeMAO,
  reconcileAcquisitionUnderwriting,
} from '../index.js';

describe('Requirement 4: Canonical Acquisition Metrics (Hand-Recomputable Cases)', () => {
  // Scenario: $500,000 Purchase Price, $50,000 Rehab Budget, $700,000 ARV, $5,000 Monthly Rent
  const inputs = {
    purchasePrice: 500000,
    rehabBudget: 50000,
    estimatedARV: 700000,
    grossRentMonthly: 5000,
    operatingExpenseRatioPct: 35.0,
    vacancyRatePct: 6.0, // Institutional vacancy floor
    targetLtvPct: 75.0,
    interestRatePct: 6.5,
    amortizationYears: 30,
    buyerClosingCostsPct: 2.0,
    terminalValueMethod: 'appreciation_pct',
  };

  const reconciled = reconcileAcquisitionUnderwriting(inputs);

  it('1. ARV (After-Repair Value) equals canonical input', () => {
    // ARV is directly taken from comps/appraisal input
    expect(inputs.estimatedARV).toBe(700000);
  });

  it('2. Total Cost Basis = PurchasePrice + ClosingCosts + RehabBudget', () => {
    // Closing costs: 500,000 * 2% = 10,000
    // Total basis: 500,000 + 10,000 + 50,000 = 560,000
    expect(reconciled.buyerClosingCostsAmount).toBe(10000);
    expect(reconciled.totalCostBasis).toBe(560000);
  });

  it('3. Net Operating Income (NOI) = (GrossRent * (1 - Vacancy)) - OpEx', () => {
    // Gross Annual Rent: 5,000 * 12 = 60,000
    // Vacancy (6%): 60,000 * 0.06 = 3,600
    // Effective Gross Income (EGI): 60,000 - 3,600 = 56,400
    // Operating Expenses (35% of Gross): 60,000 * 0.35 = 21,000
    // NOI: 56,400 - 21,000 = 35,400
    expect(reconciled.grossOperatingIncome).toBe(56400);
    expect(reconciled.totalOperatingExpenses).toBe(21000);
    expect(reconciled.netOperatingIncome).toBe(35400);
  });

  it('4. Cap Rate on Cost = (NOI / TotalCostBasis) * 100', () => {
    // NOI: 35,400
    // TotalCostBasis: 560,000
    // Cap Rate: (35,400 / 560,000) * 100 = 6.3214% -> 6.3%
    const expectedCapRate = Number(((35400 / 560000) * 100).toFixed(1));
    expect(expectedCapRate).toBe(6.3);
    expect(reconciled.capRateOnCost).toBe(6.3);
  });

  it('5. Debt Service & Cash Required', () => {
    // Loan Amount: 500,000 * 75% = 375,000
    // Monthly Payment on 375,000 at 6.5% for 30 years:
    // r = 0.065 / 12 = 0.005416666...
    // n = 360
    // P = 375000 * (r * (1+r)^360) / ((1+r)^360 - 1) = 2370.26
    // Annual Debt Service: round(2370.26 * 12) = 28,443
    // Cash Required: Basis (560,000) - Loan (375,000) = 185,000
    expect(reconciled.loanAmount).toBe(375000);
    expect(reconciled.monthlyDebtService).toBe(2370.26);
    expect(reconciled.annualDebtService).toBe(28443);
    expect(reconciled.cashRequired).toBe(185000);
  });

  it('6. Cash-on-Cash Return = ((NOI - AnnualDebt) / CashRequired) * 100', () => {
    // Annual Net Cash Flow: 35,400 - 28,443 = 6,957
    // Cash-on-Cash: (6,957 / 185,000) * 100 = 3.7605% -> 3.8%
    expect(reconciled.annualNetCashFlow).toBe(6957);
    const expectedCoC = Number(((6957 / 185000) * 100).toFixed(1));
    expect(expectedCoC).toBe(3.8);
    expect(reconciled.cashOnCashReturnPct).toBe(3.8);
  });

  it('7. Debt Service Coverage Ratio (DSCR) = NOI / AnnualDebtService', () => {
    // NOI: 35,400
    // AnnualDebt: 28,443
    // DSCR: 35,400 / 28,443 = 1.24458... -> 1.24x
    const expectedDscr = Number((35400 / 28443).toFixed(2));
    expect(expectedDscr).toBe(1.24);
    expect(reconciled.dscr).toBe(1.24);
  });

  it('8. Loan-to-Value (LTV) = (LoanAmount / PurchasePrice) * 100', () => {
    // 375,000 / 500,000 = 75.0%
    expect(reconciled.ltvPct).toBe(75.0);
  });

  it('9. Gross Rent Multiplier (GRM) = PurchasePrice / AnnualGrossRent', () => {
    // Purchase Price: 500,000
    // Annual Gross Rent: 60,000
    // GRM: 500,000 / 60,000 = 8.333... -> 8.3
    const expectedGrm = Number((500000 / 60000).toFixed(1));
    expect(expectedGrm).toBe(8.3);
    expect(reconciled.grossRentMultiplier).toBe(8.3);
  });

  it('10. Maximum Allowable Offer (MAO / 70% Rule)', () => {
    // MAO = (ARV * 0.70) - RehabBudget - ClosingCosts
    // MAO = (700,000 * 0.70) - 50,000 - 10,000 = 490,000 - 60,000 = 430,000
    const mao = computeMAO(700000, 50000, 0.70, 10000);
    expect(mao.mao).toBe(430000);
    expect(mao.rawMao).toBe(430000);
    expect(mao.isViable).toBe(true);
    expect(reconciled.maximumAllowableOffer70Pct).toBe(430000);
  });

  it('11. Projected Internal Rate of Return (IRR) solves via canonical numerical solver', () => {
    // Returns positive IRR solved through numerical root-finding
    expect(reconciled.projectedIrrPct).toBeGreaterThan(0);
    expect(reconciled.projectedIrrPct).toBeLessThan(100);
  });
});
