import { canonicalSeedDeal } from './canonical-seed-deal';

export const edgeCaseScenarios = {
  // Scenario 1: Zero Rent
  zeroRent: {
    ...canonicalSeedDeal,
    gross_scheduled_rent: 0,
    operating_expenses: {
      ...canonicalSeedDeal.operating_expenses,
      management: 0,
    },
  },

  // Scenario 2: 100% Vacancy
  fullVacancy: {
    ...canonicalSeedDeal,
    vacancy_rate: 100,
  },

  // Scenario 3: Negative Cash Flow & High Expenses
  highOpEx: {
    ...canonicalSeedDeal,
    operating_expenses: {
      tax: 8000,
      insurance: 4000,
      security: 1000,
      maintenance: 6000,
      utilities: 3000,
      management: 2880,
      HOA: 2000,
      capex: 5000,
    },
  },

  // Scenario 4: All-Cash Purchase ($0 Loan Amount)
  allCash: {
    ...canonicalSeedDeal,
    down_payment_pct: 100,
    loan_amount: 0,
    interest_rate: 0,
    loan_term_years: 0,
    total_cash_invested: 279000,
  },

  // Scenario 5: Missing Inputs (Honesty Rule Validation)
  missingPurchasePrice: {
    ...canonicalSeedDeal,
    purchase_price: undefined as any,
  },

  missingRent: {
    ...canonicalSeedDeal,
    gross_scheduled_rent: undefined as any,
  },
};
