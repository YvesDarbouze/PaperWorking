import type { ProjectPhaseDefinition, ProjectPhaseKey } from '@/types/schema';

// Canonical phase map — single source of truth for the deal lifecycle.
// projectStateMachine.ts and UI phase stepper both derive from this.
export const DEAL_PHASES: Record<ProjectPhaseKey, ProjectPhaseDefinition> = {
  acquisition: {
    key: 'acquisition',
    label: 'Acquisition',
    order: 0,
    allowedTransitions: ['fund'],
    requiredDocuments: [],
    completionGate: [
      'MAO calculated and accepted',
      'Offer letter sent',
    ],
  },
  fund: {
    key: 'fund',
    label: 'Fund',
    order: 1,
    allowedTransitions: ['hold'],
    requiredDocuments: ['Inspection Report', 'Title Commitment', 'Loan Estimate'],
    completionGate: [
      'Signed purchase contract uploaded',
      'Title commitment received',
      'Hard money loan pre-approval confirmed',
      'All due-diligence inspections completed',
    ],
  },
  hold: {
    key: 'hold',
    label: 'Hold',
    order: 2,
    allowedTransitions: ['exit'],
    requiredDocuments: ['Inspection Report'],
    completionGate: [
      'All rehab tasks marked Complete',
      'All draw requests approved by lender',
      'Contingency budget reconciled',
      'Final walkthrough site visit logged',
    ],
  },
  exit: {
    key: 'exit',
    label: 'Exit',
    order: 3,
    allowedTransitions: [],
    requiredDocuments: ['Closing Disclosure', 'Title Commitment'],
    completionGate: [
      'Closing disclosure verified by lawyer',
      'Wire confirmed',
      'Title/deed transfer recorded',
      'Payout waterfall fully settled',
    ],
  },
};

export const DEAL_PHASE_ORDER: ProjectPhaseKey[] = [
  'acquisition',
  'fund',
  'hold',
  'exit',
];
