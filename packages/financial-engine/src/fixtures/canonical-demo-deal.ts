/**
 * Canonical Single Shared Demo Dataset for PaperWorking.
 *
 * Used identically across:
 * 1. Marketing Hero Product Showcase (apps/web/components/marketing/HeroProductShowcase.tsx)
 * 2. Deal Calculator Golden Verification & Testing
 * 3. Seeded Demo Views & Audit Documentation
 *
 * Resolves the previous contradiction between showcase (2.7% CoC, 35% OpEx)
 * and audit verification (4.2% CoC, itemized OpEx).
 */
export const canonicalDemoDeal = {
  // Property Identity
  propertyAddress: '1247 Elm Street, Austin, TX 78702',
  beds: 3,
  baths: 2,
  sqft: 1850,
  yearBuilt: 1984,

  // Acquisition & Capital Stack
  purchasePrice: 520000,
  targetLtvPct: 75.0,
  loanAmount: 390000,
  buyerClosingCostsPct: 3.0,
  buyerClosingCosts: 15600,
  rehabBudget: 59800,
  estimatedARV: 680000,
  totalCostBasis: 595400,
  cashRequired: 205400,

  // Financing (First Mortgage)
  interestRatePct: 6.5,
  amortizationYears: 30,
  monthlyDebtService: 2465, // Math.round(computeMonthlyPayment(390000, 0.065, 30)) [exact $2,465.08]
  annualDebtService: 29581, // Math.round(computeMonthlyPayment(...) * 12) = $29,581
 
  // Operations & Cash Flow
  grossRentMonthly: 5200,
  annualGrossRent: 62400, // 5,200 * 12
  vacancyRatePct: 5.0,
  vacancyAmount: 3120, // 62,400 * 0.05
  grossOperatingIncome: 59280, // 62,400 - 3,120
  operatingExpensesAnnual: 21142, // Itemized OpEx ($1,761.83/mo)
  operatingExpenseRatioPct: (21142 / 62400) * 100, // 33.8814...% (reconciles exact $21,142 OpEx)
  netOperatingIncome: 38138, // 59,280 - 21,142
  annualCashFlow: 8557, // 38,138 - 29,581
  monthlyCashFlow: 713, // Math.round(8,557 / 12)

  // Primary Institutional Performance Metrics
  capRateOnCost: 6.4, // (38,138 / 595,400) * 100 = 6.405% -> 6.4%
  cashOnCashReturnPct: 4.2, // (8,557 / 205,400) * 100 = 4.166% -> 4.2%
  dscr: 1.29, // 38,138 / 29,581 = 1.289
  grossRentMultiplier: 8.3, // 520,000 / 62,400 = 8.33

  // True DCF Projected IRR Model & Assumptions
  terminalValueMethod: 'appreciation_pct' as const,
  terminalValueLabel: 'Exit @ 3.0%/yr on $520,000 purchase price' as const,
  holdPeriodYears: 5,
  annualAppreciationPct: 3.0,
  sellingCostsPct: 6.0,
  exitValue: 602823, // 520,000 * (1.03)^5 = 602,822.52
  sellingCosts: 36169, // 602,823 * 0.06
  amortizedLoanBalanceAtExit: 365083, // Real 30-year 6.5% schedule at month 60
  netSaleProceeds: 201571, // 602,823 - 365,083 - 36,169 = 201,571
  projectedIrrPct: 3.8, // True DCF Equity IRR: 3.8%
  irrStatus: 'converged' as const,

  // W2-08: Negative Leverage Institutional Comparison
  loanConstantPct: 7.585, // 29,580 / 390,000 = 7.5846...% -> 7.585%
  yieldOnCostPct: 6.4, // Cap Rate on Cost: 6.4%
  isNegativeLeverage: true, // 6.4% < 7.585% -> Negative leverage active
} as const;

export type CanonicalDemoDeal = typeof canonicalDemoDeal;
