/**
 * Hold Phase Card Registry — Canonical Card Definitions
 *
 * Derived strictly from docs/spec/reil-complete-four-phase-questions-tasks.md
 * Every card has an ID, title, plain-language question text, why we ask line,
 * writes definition, and reveal condition.
 *
 * Decision H-1: disposition_type (SALE | LEASE | RENT) is read-only in Hold.
 * Card H5 reveals ONLY the card matching disposition_type.
 */

export type DispositionType = 'RENT' | 'LEASE' | 'SALE';
export type ScopeTier = 'STAGE' | 'REFURBISH' | 'RENOVATE' | 'GUT' | 'DEVELOP';

export interface HoldCardDefinition {
  id: string;
  columnId: 'H1' | 'H2' | 'H3' | 'H4' | 'H5';
  columnTitle: string;
  cardName: string;
  questionText: string;
  whyWeAsk: string;
  writes: string[];
  revealCondition: (context: { dispositionType?: DispositionType; scopeTier?: ScopeTier }) => boolean;
  deepLinkMetricId?: 'noi' | 'cashFlow' | 'expenseRatio';
}

export const HOLD_CARD_REGISTRY: HoldCardDefinition[] = [
  // ── Column H1 — RENOVATION PLAN ───────────────────────────────────────────
  {
    id: 'H1.1',
    columnId: 'H1',
    columnTitle: 'H1 · RENOVATION PLAN',
    cardName: 'Card H1.1 — Scope tier',
    questionText: 'What level of work does this property need?',
    whyWeAsk: 'The tier sets the budget conversation and the timeline expectation.',
    writes: ['renovation_tier (enum · user_actual)'],
    revealCondition: () => true, // Always revealed
  },
  {
    id: 'H1.2',
    columnId: 'H1',
    columnTitle: 'H1 · RENOVATION PLAN',
    cardName: 'Card H1.2 — Budget & timeline',
    questionText: "What's the renovation budget and target completion date?",
    whyWeAsk: 'Tracking budget versus actuals protects your projected profit margin.',
    writes: ['rehab_budget (currency · user_assumption · projected)', 'rehab_completion_target (date)'],
    revealCondition: () => true, // Always revealed
  },

  // ── Column H2 — RENOVATION TRACKING ───────────────────────────────────────
  {
    id: 'H2.1',
    columnId: 'H2',
    columnTitle: 'H2 · RENOVATION TRACKING',
    cardName: 'Card H2.1 — Spend tracker',
    questionText: 'Log your renovation expenses',
    whyWeAsk: 'Running log of renovation spend; distinguishes capex improvements from maintenance repairs.',
    writes: ['rehab_spend[] (amount, date, category, note)'],
    // Stage-tier Projects see a compressed H2 view
    revealCondition: () => true,
  },
  {
    id: 'H2.2',
    columnId: 'H2',
    columnTitle: 'H2 · RENOVATION TRACKING',
    cardName: 'Card H2.2 — Completion',
    questionText: 'Renovation complete?',
    whyWeAsk: 'Finalizes actual renovation spend and locks your rehab cost basis.',
    writes: ['rehab_completed_date (actual)', 'rehab_budget → rehab_spend_total'],
    revealCondition: () => true,
  },

  // ── Column H3 — HOLDING COSTS ─────────────────────────────────────────────
  {
    id: 'H3.1',
    columnId: 'H3',
    columnTitle: 'H3 · HOLDING COSTS',
    cardName: 'Card H3.1 — Itemized monthly holding costs',
    questionText: 'Itemize monthly holding expenses (taxes, insurance, utilities, maintenance, HOA, management, capex)',
    whyWeAsk: 'Vacancy has a monthly price; knowing it is how you protect your margin.',
    writes: ['holding_cost_<category> (currency · user_actual, recurring)'],
    revealCondition: () => true,
    deepLinkMetricId: 'expenseRatio',
  },

  // ── Column H4 — MARKET & VALUE ────────────────────────────────────────────
  {
    id: 'H4.1',
    columnId: 'H4',
    columnTitle: 'H4 · MARKET & VALUE',
    cardName: 'Card H4.1 — Current value',
    questionText: 'Current estimated market value?',
    whyWeAsk: "Appreciation is a third of long-run returns — track it, don't guess it at Exit.",
    writes: ['current_value (currency, dated series)'],
    revealCondition: () => true,
  },

  // ── Column H5 — GO TO MARKET (strategy-conditional) ──────────────────────
  {
    id: 'H5.R',
    columnId: 'H5',
    columnTitle: 'H5 · GO TO MARKET',
    cardName: 'Card H5.R — Rent path',
    questionText: 'List it: target monthly rent, where you are advertising, application screening checklist.',
    whyWeAsk: 'Prepare your property for long-term rental income.',
    writes: ['target_rent (currency · user_assumption)', 'listing_ad_log', 'screening_checklist_state'],
    revealCondition: ({ dispositionType }) => dispositionType === 'RENT' || !dispositionType, // Defaults to RENT if unassigned
    deepLinkMetricId: 'noi',
  },
  {
    id: 'H5.L',
    columnId: 'H5',
    columnTitle: 'H5 · GO TO MARKET',
    cardName: 'Card H5.L — Lease path',
    questionText: 'Commercial listing details: target lease terms (rate, term, NNN/gross flag)',
    whyWeAsk: 'Set up commercial lease parameters and tenant terms.',
    writes: ['target_lease_terms (struct)', 'listing_ad_log'],
    revealCondition: ({ dispositionType }) => dispositionType === 'LEASE',
    deepLinkMetricId: 'cashFlow',
  },
  {
    id: 'H5.S',
    columnId: 'H5',
    columnTitle: 'H5 · GO TO MARKET',
    cardName: 'Card H5.S — Sale path',
    questionText: 'List it: list price, listing agent, where it is marketed.',
    whyWeAsk: 'Market your renovated flip property for maximum sale yield.',
    writes: ['list_price_sale (currency)', 'listing_ad_log'],
    revealCondition: ({ dispositionType }) => dispositionType === 'SALE',
  },
];
