import { ExpenseTag } from '@/lib/metrics/types';

export type ClassifiedCategory =
  | 'rental_income'
  | 'sale_proceeds'
  | 'refund'
  | ExpenseTag
  | 'uncategorized';

export interface PlaidRawTransaction {
  transaction_id: string;
  amount: number; // positive = expense, negative = credit/income in Plaid
  name: string;
  category: string[];
  date: string;
}

export interface ClassifiedTransaction {
  transactionId: string;
  description: string;
  amount: number;
  type: 'revenue' | 'expense';
  classifiedCategory: ClassifiedCategory;
  date: string;
}

/**
 * Auto-classifies raw bank transactions from Plaid into PaperWorking Canonical 8 tax categories:
 * ['tax', 'insurance', 'security', 'maintenance', 'utilities', 'management', 'HOA', 'capex']
 *
 * Rules:
 * - Plaid category 'Mortgage' -> DO NOT auto-tag as expense (debt service is calculated separately by amortization engine)
 * - Plaid category 'Insurance' -> 'insurance' tag
 * - Plaid category 'Tax' or 'Property Tax' -> 'tax' tag
 * - Plaid category 'Repair and Maintenance' -> 'maintenance' tag
 * - Plaid category 'Utilities' -> 'utilities' tag
 * - Plaid category 'Service' (contractor) -> 'uncategorized' (user must classify to 'maintenance' or 'capex')
 * - Plaid category 'Advertising' or 'Marketing' -> 'uncategorized' (not in canonical 8)
 */
export function classifyPlaidTransaction(tx: PlaidRawTransaction): ClassifiedTransaction {
  const nameLower = tx.name.toLowerCase();
  const catJoined = tx.category.join(' ').toLowerCase();

  let classifiedCategory: ClassifiedCategory = 'uncategorized';
  let type: 'revenue' | 'expense' = tx.amount < 0 ? 'revenue' : 'expense';

  if (nameLower.includes('rent') || catJoined.includes('rent') || nameLower.includes('tenant')) {
    classifiedCategory = 'rental_income';
    type = 'revenue';
  } else if (nameLower.includes('title') || nameLower.includes('escrow sale') || nameLower.includes('proceeds')) {
    classifiedCategory = 'sale_proceeds';
    type = 'revenue';
  } else if (nameLower.includes('insurance') || nameLower.includes('geico') || nameLower.includes('state farm') || catJoined.includes('insurance')) {
    classifiedCategory = 'insurance';
    type = 'expense';
  } else if (nameLower.includes('tax') || nameLower.includes('treasurer') || nameLower.includes('county tax') || catJoined.includes('tax')) {
    classifiedCategory = 'tax';
    type = 'expense';
  } else if (nameLower.includes('home depot') || nameLower.includes('lowes') || nameLower.includes('plumbing') || nameLower.includes('repair') || catJoined.includes('maintenance')) {
    classifiedCategory = 'maintenance';
    type = 'expense';
  } else if (nameLower.includes('utility') || nameLower.includes('electric co') || nameLower.includes('water') || nameLower.includes('power') || catJoined.includes('utilities')) {
    classifiedCategory = 'utilities';
    type = 'expense';
  } else if (nameLower.includes('hoa') || catJoined.includes('hoa') || catJoined.includes('association')) {
    classifiedCategory = 'HOA';
    type = 'expense';
  } else if (nameLower.includes('property manager') || nameLower.includes('management fee')) {
    classifiedCategory = 'management';
    type = 'expense';
  }
  // Mortgage, Contractor, Marketing remain 'uncategorized' per canonical 8 rule

  return {
    transactionId: tx.transaction_id,
    description: tx.name,
    amount: Math.abs(tx.amount),
    type,
    classifiedCategory,
    date: tx.date,
  };
}
