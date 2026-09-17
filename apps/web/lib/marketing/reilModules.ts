export interface ReilPhaseModule {
  phaseNumber: string;
  title: string;
  bullets: string[];
}

export const REIL_PHASE_MODULES: ReilPhaseModule[] = [
  {
    phaseNumber: 'PHASE 01',
    title: 'Acquisition',
    bullets: [
      'Source and track deal leads',
      'Pull live property data and an automated valuation',
      'Underwrite with the Deal Calculator (cap rate, IRR, cash-on-cash)',
      'Make offers and track negotiations',
      'Optionally crowdfund a deal with serious investors',
    ],
  },
  {
    phaseNumber: 'PHASE 02',
    title: 'Fund',
    bullets: [
      'Line up the money and the paperwork',
      'Track contingency deadlines and earnest money',
      'Keep contracts in one vault',
      'Get alerted before dates go hard',
    ],
  },
  {
    phaseNumber: 'PHASE 03',
    title: 'Hold',
    bullets: [
      'Link milestones to your budget',
      'Log expenses as they happen',
      'Watch holding costs and budget-vs-actual in real time',
    ],
  },
  {
    phaseNumber: 'PHASE 04',
    title: 'Exit',
    bullets: [
      'Sell outright or keep as rental / lease / Airbnb / pop-up / commercial',
      'Generate the performance record your buyer, lender, or appraiser expects',
    ],
  },
];

