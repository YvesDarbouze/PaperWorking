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

export interface FinancialTransactionsByProjectQuery {
  status?: string | null;
  tab?: string | null;
  search?: string | null;
}

export function parseFinancialTransactionsQuery(query: FinancialTransactionsByProjectQuery): {
  status: string;
  tab: FinancialTransactionTab;
  search?: string;
} {
  const status = query.status || 'PENDING_REVIEW';
  const tabRaw = (query.tab || 'ALL').toUpperCase();
  const tab: FinancialTransactionTab =
    tabRaw === 'REVENUE' ||
    tabRaw === 'EXPENSE' ||
    tabRaw === 'LIABILITY' ||
    tabRaw === 'TRANSFER'
      ? tabRaw
      : 'ALL';
  const search = query.search?.trim().toLowerCase() || undefined;

  return { status, tab, search };
}

export function categoriesForTab(tab: FinancialTransactionTab): readonly string[] | null {
  if (tab === 'REVENUE') return REVENUE_CATEGORIES;
  if (tab === 'EXPENSE') return EXPENSE_CATEGORIES;
  if (tab === 'LIABILITY') return LIABILITY_CATEGORIES;
  if (tab === 'TRANSFER') return TRANSFER_CATEGORIES;
  return null;
}

export function formatFinancialTransactionRow(tx: Record<string, unknown>): Record<string, unknown> {
  return {
    id: tx.id,
    projectId: tx.projectId,
    source: tx.source,
    plaidTransactionId: tx.plaidTransactionId,
    amount: Number(tx.amount),
    direction: tx.direction,
    transactionDate: tx.transactionDate,
    postedDate: tx.postedDate ?? null,
    payee: tx.payee,
    description: tx.description,
    category: tx.category,
    subCategory: tx.subCategory,
    matchedLeaseId: tx.matchedLeaseId,
    status: tx.status,
    confidenceScore: tx.confidenceScore,
    isRecurring: tx.isRecurring,
    isSplit: tx.isSplit,
    notes: tx.notes,
    plaidPersonalFinanceCategory: tx.plaidPersonalFinanceCategory ?? null,
  };
}
