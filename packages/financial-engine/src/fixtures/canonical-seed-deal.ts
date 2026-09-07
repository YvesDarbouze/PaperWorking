export const canonicalSeedDeal = {
  // Property & Purchase
  purchase_price: 279000,
  down_payment_pct: 20,
  down_payment_amount: 55800,
  total_cash_invested: 55800,
  loan_amount: 223200,
  interest_rate: 0.065,
  loan_term_years: 30,
  property_value: 279000,
  property_square_footage: 1800,
  number_of_units: 1,
  total_units: 1,
  occupied_units: 1,

  // Income
  gross_scheduled_rent: 24000,        // $2,000/mo × 12
  other_income: 0,
  vacancy_rate: 3,                    // 3%

  // Operating Expenses (Canonical 8 ONLY)
  expenses: {
    tax: 3600,                        // Property tax
    insurance: 1800,                  // Insurance premium
    security: 0,                      // Security systems
    maintenance: 1995,                // Repairs & upkeep
    utilities: 1000,                  // Electric, gas, water
    management: 2400,                 // 10% of gross_scheduled_rent
    HOA: 0,                           // HOA fees
    capex: 1200,                      // Capital improvements
  },
  operating_expenses: {
    tax: 3600,
    insurance: 1800,
    security: 0,
    maintenance: 1995,
    utilities: 1000,
    management: 2400,
    HOA: 0,
    capex: 1200,
  },

  // Loan & Hold
  monthly_mortgage_payment: 1410.78,
  total_debt_service: 16929.36,       // $1,410.78 × 12
  rehab_costs: 0,
  holding_start_date: new Date('2024-01-01'),

  // Exit
  sale_price: null,                   // Not exited yet
  sale_date: null,
  marketing_costs: 0,
  realtor_commission: 0,

  // Risk
  financial_risk_score: 5,
  market_risk_score: 4,
  operational_risk_score: 3,
  compliance_risk_score: 2,

  // CapEx accounting inputs (NetSuite CapEx KPI)
  ppe_previous_year: 50000,
  ppe_current_year: 65000,
  depreciation_current_year: 5000,
  compliant_items_count: 8,
  total_compliance_requirements: 8,
};

export const expectedGoldenValues = {
  monthlyMortgagePayment: 1410.78,
  totalDebtService: 16929.36,
  goi: 24000,
  operatingExpenses: 10795,
  noi: 13205,
  capexKpi: 20000,
  capRatePct: 4.7,
  cashFlow: -23724.36,
  cashOnCashPct: -42.52,
  dscr: 0.78,
  ltvPct: 80,
  equityToValuePct: 20,
  grm: 11.6,
  occupancyRatePct: 100,
  expenseRatioPct: 44.98,
  riskAssessmentScore: 3.5,
};
