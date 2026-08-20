export const REVENUE_CATEGORIES = [
  'RENT_INCOME',
  'LATE_FEE_INCOME',
  'PET_RENT_INCOME',
  'PARKING_INCOME',
  'LAUNDRY_VENDING_INCOME',
  'APPLICATION_FEE_INCOME',
  'LEASE_TERMINATION_FEE',
  'UTILITY_REIMBURSEMENT',
  'INSURANCE_CLAIM_INCOME',
  'INTEREST_INCOME',
  'MISC_INCOME',
] as const;

export const EXPENSE_CATEGORIES = [
  'PROPERTY_TAX',
  'PROPERTY_INSURANCE',
  'HOA_FEES',
  'MANAGEMENT_FEES',
  'LEASING_FEES',
  'MAINTENANCE_REPAIR',
  'UTILITIES',
  'LANDSCAPING_SNOW',
  'PEST_CONTROL',
  'CLEANING_TURNOVER',
  'MARKETING_ADVERTISING',
  'LEGAL_PROFESSIONAL',
  'ACCOUNTING_BOOKKEEPING',
  'TRAVEL_MILEAGE',
  'BANK_CREDIT_CARD_FEES',
  'SOFTWARE_TECHNOLOGY',
  'LICENSES_PERMITS',
  'TURNOVER_COSTS',
  'SUPPLIES',
  'MISC_EXPENSE',
  'CAPITAL_EXPENDITURE',
] as const;

export const LIABILITY_CATEGORIES = [
  'MORTGAGE_PRINCIPAL',
  'MORTGAGE_INTEREST',
  'MORTGAGE_ESCROW_PAYMENT',
] as const;

export const TRANSFER_CATEGORIES = [
  'SECURITY_DEPOSIT_RECEIVED',
  'SECURITY_DEPOSIT_RETURNED',
  'OWNER_DISTRIBUTION',
  'CAPITAL_CONTRIBUTION',
  'RESERVE_TRANSFER',
  'INTER_ACCOUNT_TRANSFER',
] as const;

export type FinancialTransactionTab = 'ALL' | 'REVENUE' | 'EXPENSE' | 'LIABILITY' | 'TRANSFER';

export function categoriesForTab(tab: string): readonly string[] | null {
  const upper = tab.toUpperCase();
  if (upper === 'REVENUE') return REVENUE_CATEGORIES;
  if (upper === 'EXPENSE') return EXPENSE_CATEGORIES;
  if (upper === 'LIABILITY') return LIABILITY_CATEGORIES;
  if (upper === 'TRANSFER') return TRANSFER_CATEGORIES;
  return null;
}

export interface FinancialTransactionListFilters {
  projectId: string;
  status?: string;
  tab?: string;
  search?: string;
}

export interface FinancialTransactionRecord {
  id: string;
  projectId: string;
  source: string;
  plaidTransactionId: string | null;
  amount: number | bigint;
  direction: string;
  transactionDate: Date | string;
  postedDate?: Date | string | null;
  payee: string | null;
  description: string | null;
  category: string | null;
  subCategory: string | null;
  matchedLeaseId: string | null;
  status: string;
  confidenceScore: number | null;
  isRecurring: boolean;
  isSplit: boolean;
  notes: string | null;
  plaidTransaction?: { personalFinanceCategory?: string | null } | null;
}

export function formatFinancialTransaction(t: FinancialTransactionRecord) {
  const date = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
  const posted =
    t.postedDate == null
      ? null
      : t.postedDate instanceof Date
        ? t.postedDate.toISOString()
        : new Date(t.postedDate).toISOString();

  return {
    id: t.id,
    projectId: t.projectId,
    source: t.source,
    plaidTransactionId: t.plaidTransactionId,
    amount: Number(t.amount),
    direction: t.direction,
    transactionDate: date.toISOString(),
    postedDate: posted,
    payee: t.payee,
    description: t.description,
    category: t.category,
    subCategory: t.subCategory,
    matchedLeaseId: t.matchedLeaseId,
    status: t.status,
    confidenceScore: t.confidenceScore,
    isRecurring: t.isRecurring,
    isSplit: t.isSplit,
    notes: t.notes,
    plaidPersonalFinanceCategory: t.plaidTransaction?.personalFinanceCategory ?? null,
  };
}

export function normalizeSearchQuery(search: string | null | undefined): string | undefined {
  const trimmed = search?.trim().toLowerCase();
  return trimmed || undefined;
}
