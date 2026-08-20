export const REIL_PHASES = [
  {
    key: 'acquisition' as const,
    label: 'Acquisition',
    icon: 'domain_add',
    color: '#454955',
    colorAlpha: 'rgba(69,73,85,',
    description: 'Find targets, crowd-fund deals, generate offer letters, and track seller responses.',
    activities: ['Property search', 'Offer letters', 'Crowdfunding', 'Due diligence'],
  },
  {
    key: 'purchase' as const,
    label: 'Fund',
    icon: 'account_balance',
    color: '#7A9EAA',
    colorAlpha: 'rgba(122,158,170,',
    description: 'Loan processing, real estate attorney, all documents needed to close the deal.',
    activities: ['Loan processing', 'Attorney', 'Title search', 'Closing docs'],
  },
  {
    key: 'hold' as const,
    label: 'Hold',
    icon: 'construction',
    color: '#ffac5a',
    colorAlpha: 'rgba(255,172,90,',
    description: 'Track rehab budgets, holding costs, and performance during ownership.',
    activities: ['Rehab budget', 'Holding costs', 'Tenant management', 'Cash flow'],
  },
  {
    key: 'exit' as const,
    label: 'Exit',
    icon: 'exit_to_app',
    color: '#00dd94',
    colorAlpha: 'rgba(0,221,148,',
    description: 'Marketing, final sale, realized ROI charts, and end-of-year tax documents.',
    activities: ['Listing costs', 'Sale tracking', 'ROI analysis', 'Tax docs'],
  },
] as const;

export type ReilPhaseKey = (typeof REIL_PHASES)[number]['key'];
