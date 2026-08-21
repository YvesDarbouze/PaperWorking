/** Data mirror of v0 How It Works phase cards — used by tests / shared references. */
export const HOW_IT_WORKS_PHASE_CARDS = [
  {
    num: 'PHASE 01',
    title: 'Acquisition',
    description:
      'Acquisition: Decide if the deal works before you buy. The Deal Analyzer pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
  },
  {
    num: 'PHASE 02',
    title: 'Fund',
    description:
      'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
  },
  {
    num: 'PHASE 03',
    title: 'Hold',
    description:
      'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
  },
  {
    num: 'PHASE 04',
    title: 'Exit',
    description:
      'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
  },
] as const;

/** @deprecated Prefer HOW_IT_WORKS_PHASE_CARDS — kept for older test imports. */
export const HOW_IT_WORKS_STEPS = HOW_IT_WORKS_PHASE_CARDS.map((card, index) => ({
  step: index + 1,
  phase: card.num,
  title: card.title,
  summary: card.description,
}));

export const HOW_IT_WORKS_HIGHLIGHTS = [
  {
    title: 'One workspace per deal',
    description:
      'Projects carry documents, KPIs, reports, and vendor requests through every REIL phase.',
  },
  {
    title: 'Canonical financial engine',
    description:
      'Scorecard metrics derive from a single authority — no spreadsheet drift between insights and exports.',
  },
  {
    title: 'Role-aware surfaces',
    description:
      'Investors, teams, vendors, and platform admins each get purpose-built portals on the same domain.',
  },
] as const;
