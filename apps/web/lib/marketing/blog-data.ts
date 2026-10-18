export type BlogPhaseCategory = 'Acquisition' | 'Fund' | 'Hold' | 'Exit';

export interface BlogSection {
  heading: string;
  body: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  category: BlogPhaseCategory;
  publishedAt: string;
  readingTime: string;
  summary: string;
  sections: BlogSection[];
  relatedLinks: { label: string; href: string }[];
}

export const BLOG_CATEGORIES: BlogPhaseCategory[] = [
  'Acquisition',
  'Fund',
  'Hold',
  'Exit',
];

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'underwriting-discipline-across-the-reil',
    title: 'Underwriting Discipline Across the 4-Phase Real Estate Investment Lifecycle',
    category: 'Acquisition',
    publishedAt: 'October 2026',
    readingTime: '6 min read',
    summary:
      'How connecting Acquisition underwriting assumptions directly to Fund, Hold, and Exit prevents drift between initial pro formas and realized returns.',
    sections: [
      {
        heading: 'Why Static Pro Formas Drift After Closing',
        body: 'In most real estate workflows, an acquisition spreadsheet is archived the day a contract is signed. Loan terms shift during origination, rehab draws change during construction, and operating expenses fluctuate once tenants move in. When underwriting lives in a detached file, investors lose visibility into how each adjustment affects Net Operating Income (NOI), Debt Service Coverage Ratio (DSCR), and Internal Rate of Return (IRR).',
      },
      {
        heading: 'One Canonical Engine Across All 33 Metrics',
        body: 'PaperWorking routes every deal through a single deterministic financial engine. The assumptions entered in the Deal Calculator during Acquisition carry forward into the project scorecard. When loan estimates, rehab line items, or holding periods change in later phases, all 33 KPIs recalculate from the updated project inputs.',
      },
      {
        heading: 'Stress-Testing Before You Commit Earnest Money',
        body: 'Before promoting a deal from Acquisition to Fund, compare your Maximum Allowable Offer (MAO), Cash-on-Cash return, and cap rate against your target thresholds. Structuring sensitivity checks early ensures your margin of safety holds even if debt costs or renovation timelines expand.',
      },
    ],
    relatedLinks: [
      { label: 'Open Deal Calculator', href: '/deal-calculator' },
      { label: 'Explore The Playbook (33 Metrics)', href: '/support/metrics' },
    ],
  },
  {
    slug: 'contingency-and-earnest-money-controls-in-fund',
    title: 'Structuring Contingency Deadlines and Lender Packages in the Fund Phase',
    category: 'Fund',
    publishedAt: 'October 2026',
    readingTime: '5 min read',
    summary:
      'A practical guide to organizing inspection periods, appraisal contingencies, earnest money deposits, and lender documentation in one audit-ready vault.',
    sections: [
      {
        heading: 'Tracking Hard Dates Before Deposit Capital Is at Risk',
        body: 'Every purchase contract introduces time-sensitive obligations: earnest money wire windows, physical inspection periods, title review deadlines, and financing contingencies. Missing a notice date can convert a refundable deposit into non-refundable capital at risk.',
      },
      {
        heading: 'Compiling a Complete Lending Package',
        body: 'Lenders and capital partners evaluate deals faster when purchase contracts, scope-of-work budgets, property condition assessments, and debt terms are organized in a single workspace. Centralizing these records in the Fund phase eliminates version confusion across email threads.',
      },
      {
        heading: 'Aligning Debt Terms With Hold-Period Cash Flow',
        body: 'Verify interest rates, amortization schedules, origination points, and reserve requirements against your projected Net Operating Income before closing. Confirming that Debt Service Coverage Ratio (DSCR) clears lender covenants protects your cash position entering the Hold phase.',
      },
    ],
    relatedLinks: [
      { label: 'How the REIL Lifecycle Works', href: '/how-it-works' },
      { label: 'Real Estate Glossary', href: '/support/glossary' },
    ],
  },
  {
    slug: 'tracking-hold-phase-capex-and-noi-variance',
    title: 'Monitoring Rehab CapEx and Live Budget-vs-Actual Variance During Hold',
    category: 'Hold',
    publishedAt: 'September 2026',
    readingTime: '5 min read',
    summary:
      'How logging renovation milestones, vendor quotes, and carrying costs in real time keeps holding periods on schedule and preserves equity.',
    sections: [
      {
        heading: 'Connecting Scope Milestones to Budget Line Items',
        body: 'During the Hold phase, unmonitored scope creep and extended timelines erode project returns through both direct contractor overruns and additional months of debt service, taxes, insurance, and utilities. Linking each milestone to its allocated budget line item surfaces cost variance immediately.',
      },
      {
        heading: 'Coordinating Vendors and Field Documentation',
        body: 'Whether managing a value-add renovation or stabilizing a rental property, keeping vendor quotes, invoices, and inspection records attached to the active project ensures every draw request is backed by completed work.',
      },
      {
        heading: 'Watching Holding Costs Against Stabilized Yield',
        body: 'As expenses are logged in the Hold workspace, compare actual capital deployed against your initial underwriting baseline. Real-time visibility lets you adjust leasing or disposition timing before carrying costs compress your equity multiple.',
      },
    ],
    relatedLinks: [
      { label: 'Browse Vendor & Deals Marketplaces', href: '/marketplaces' },
      { label: 'Explore The Playbook (33 Metrics)', href: '/support/metrics' },
    ],
  },
  {
    slug: 'building-an-auditable-disposition-record-for-exit',
    title: 'Building an Auditable Performance Record for Disposition and Refinancing at Exit',
    category: 'Exit',
    publishedAt: 'September 2026',
    readingTime: '6 min read',
    summary:
      'Whether exiting through an outright sale, long-term lease, or refinance, learn how a verified project history strengthens buyer and lender confidence.',
    sections: [
      {
        heading: 'Choosing the Right Exit Strategy for Market Conditions',
        body: 'Real estate investors exit projects through multiple pathways: a complete disposition sale, a long-term residential or commercial lease, short-term hospitality operations, or a cash-out refinance into a stabilized portfolio hold. Modeling net proceeds and tax basis across each scenario clarifies which exit maximizes risk-adjusted return.',
      },
      {
        heading: 'Proving Basis, CapEx Improvements, and Operating History',
        body: 'Appraisers, buyers, and refinancing lenders scrutinize documented capital improvements, historical rent rolls, and verified operating statements. When Acquisition, Fund, and Hold records live in one continuous system, generating an exit package requires no forensic accounting.',
      },
      {
        heading: 'Closing the Loop on Portfolio Track Records',
        body: 'Recording final disposition proceeds, closing costs, and realized IRR completes the Real Estate Investment Lifecycle. Each closed project strengthens your historical portfolio analytics and informs underwriting benchmarks for your next acquisition.',
      },
    ],
    relatedLinks: [
      { label: 'Open Deal Calculator', href: '/deal-calculator' },
      { label: 'Knowledge Base', href: '/help' },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
