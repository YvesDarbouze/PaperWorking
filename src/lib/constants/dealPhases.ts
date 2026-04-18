import type { DealPhaseDefinition, DealPhaseKey } from '@/types/schema';

// Canonical phase map — single source of truth for the deal lifecycle.
// dealStateMachine.ts and UI phase stepper both derive from this.
export const DEAL_PHASES: Record<DealPhaseKey, DealPhaseDefinition> = {
  Sourcing: {
    key: 'Sourcing',
    label: 'Sourcing',
    order: 0,
    allowedTransitions: ['Under Contract'],
    requiredDocuments: [],
    completionGate: [
      'MAO calculated and accepted',
      'Offer letter sent',
    ],
  },
  'Under Contract': {
    key: 'Under Contract',
    label: 'Under Contract',
    order: 1,
    allowedTransitions: ['Rehab'],
    requiredDocuments: ['Inspection Report', 'Title Commitment', 'Loan Estimate'],
    completionGate: [
      'Signed purchase contract uploaded',
      'Title commitment received',
      'Hard money loan pre-approval confirmed',
      'All due-diligence inspections completed',
    ],
  },
  Rehab: {
    key: 'Rehab',
    label: 'Rehab',
    order: 2,
    allowedTransitions: ['Listed', 'Rented'],
    requiredDocuments: ['Inspection Report'],
    completionGate: [
      'All rehab tasks marked Complete',
      'All draw requests approved by lender',
      'Contingency budget reconciled',
      'Final walkthrough site visit logged',
    ],
  },
  Listed: {
    key: 'Listed',
    label: 'Listed',
    order: 3,
    allowedTransitions: ['Sold'],
    requiredDocuments: ['Appraisal Report'],
    completionGate: [
      'MLS listing active',
      'Appraisal report uploaded',
    ],
  },
  Sold: {
    key: 'Sold',
    label: 'Sold',
    order: 4,
    allowedTransitions: [],
    requiredDocuments: ['Closing Disclosure', 'Title Commitment'],
    completionGate: [
      'Closing disclosure verified by lawyer',
      'Wire confirmed',
      'Title/deed transfer recorded',
      'Payout waterfall fully settled',
    ],
  },
  Rented: {
    key: 'Rented',
    label: 'Rented',
    order: 4,
    allowedTransitions: ['Sold'],
    requiredDocuments: [],
    completionGate: [
      'Lease executed',
      'First month rent collected',
    ],
  },
};

export const DEAL_PHASE_ORDER: DealPhaseKey[] = [
  'Sourcing',
  'Under Contract',
  'Rehab',
  'Listed',
  'Sold',
];
