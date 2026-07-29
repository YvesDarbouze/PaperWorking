/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Plaid Rule-Based Auto-Attribution Rules
 *
 * This file contains the deterministic, rule-based matching rules
 * used to attribute transaction records to specific investment projects.
 *
 * CRITICAL POLICY: PaperWorking has NO AI/ML models. Transaction matching
 * runs exclusively on strict string matches, regex, and date/amount rules.
 * ═══════════════════════════════════════════════════════════════
 */

export interface MatchRule {
  id: string;
  category: 'rent' | 'rehab' | 'acquisition' | 'debt';
  patterns: string[];
  description: string;
}

/**
 * Deterministic string patterns matching transaction descriptions,
 * merchant names, or ledger categories.
 */
export const DETERMINISTIC_ATTRIBUTION_RULES: MatchRule[] = [
  {
    id: 'rent_attribution',
    category: 'rent',
    patterns: [
      'rent',
      'tenant payment',
      'monthly rent',
      'lease payment',
      'zelle rent',
      'venmo rent'
    ],
    description: 'Matches tenant rental income deposits based on keyword presence.'
  },
  {
    id: 'rehab_draw_attribution',
    category: 'rehab',
    patterns: [
      'depot',
      'lowes',
      'construction',
      'contractor',
      'roofing',
      'plumbing',
      'electrical',
      'hvac',
      'drywall',
      'paint',
      'materials',
      'lumber'
    ],
    description: 'Matches contractor draw requests or material expenditures to project rehab budgets.'
  },
  {
    id: 'debt_service_attribution',
    category: 'debt',
    patterns: [
      'mortgage',
      'loan payment',
      'interest payment',
      'debt service',
      'principal payment',
      'amortization'
    ],
    description: 'Matches recurring monthly debt service payments using loan schedule dates and amounts.'
  },
  {
    id: 'acquisition_escrow_attribution',
    category: 'acquisition',
    patterns: [
      'earnest money',
      'emd',
      'escrow deposit',
      'title company',
      'closing costs',
      'down payment'
    ],
    description: 'Matches acquisition-phase wire deposits to specific properties using escrow/closing dates.'
  }
];

/**
 * Standard utility to sanitize and normalize text inputs before matching.
 */
export function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}
