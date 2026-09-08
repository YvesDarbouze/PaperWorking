/**
 * Structured, versioned knowledge base for Ava.
 * Organized around PaperWorking's 4-phase lifecycle: Acquisition → Fund → Hold → Exit.
 *
 * Grounded in product configuration and the public Playbook (/support/metrics).
 * Terminology invariant: The product's core nouns are Project and Deal.
 */

import { AVA_CONFIG } from './config';

export interface KnowledgeTopic {
  id: string;
  category: 'lifecycle' | 'platform' | 'financial' | 'operations' | 'support';
  title: string;
  summary: string;
  details: string[];
  keyOutcome: string;
  frequentlyAskedQuestions?: Array<{ question: string; answer: string }>;
  playbookLink?: string;
  links?: Array<{ label: string; href: string }>;
}

export const AVA_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  {
    id: 'deal-calculator-acquisition',
    category: 'lifecycle',
    title: 'Acquisition & Deal Calculator',
    summary:
      'The Deal Calculator is the fastest path to clarity before buying. It pulls automated valuations, tax records, and live property data so you can stress-test rent, purchase price, and rehab budget in seconds.',
    details: [
      'Enter an address to auto-populate property records and baseline valuation.',
      'Adjust purchase price, rehab budget, and expected monthly rent.',
      'Instantly renders cap rate, projected IRR, and cash-on-cash return.',
      'Acts as the primary "Aha!" moment for new trial users to validate feasibility before committing capital.',
    ],
    keyOutcome:
      'Avoid bad acquisitions by seeing instant returns and downside risks before placing earnest money.',
    frequentlyAskedQuestions: [
      {
        question: 'How fast can I evaluate a new property?',
        answer:
          'In under two minutes. Plug the address into the Deal Calculator, tweak your purchase price and rehab estimate, and your cap rate, IRR, and cash-on-cash return update in real time.',
      },
      {
        question: 'Where do the property tax and valuation numbers come from?',
        answer:
          'PaperWorking pulls live property data and local tax assessment records automatically, giving you an objective benchmark to refine with your contractor estimates.',
      },
    ],
    links: [
      { label: 'Open Deal Calculator', href: '/#deal-calculator' },
      { label: 'Create New Project', href: '/projects/new' },
    ],
  },
  {
    id: 'deal-marketplace',
    category: 'lifecycle',
    title: 'Deal Marketplace & Investor Appetite',
    summary:
      'Put your Project in front of verified investors, track soft commitments and pledges, and use real investor appetite signals to guide acquisition negotiations.',
    details: [
      'Publish vetted Projects to the Deal Marketplace with customized visibility controls.',
      'Track investor pledge volume and pacing in real time.',
      'Use appetite signals to calibrate purchase offers and leverage in contract negotiations.',
    ],
    keyOutcome:
      'Secure committed capital faster by knowing your investor backing before removing contingencies.',
    frequentlyAskedQuestions: [
      {
        question: 'Who can see my Project in the Marketplace?',
        answer:
          'You control visibility. Projects can be kept private to your syndicate, shared with approved partners, or broadcast to verified Marketplace investors.',
      },
    ],
    links: [{ label: 'Deal Marketplace', href: '/marketplace' }],
  },
  {
    id: 'fund-phase-vault',
    category: 'lifecycle',
    title: 'Fund Phase, Contingencies & Secure Document Vault',
    summary:
      'Manage closing contingencies with real-time countdown clocks and protect deal diligence through the Secure Document Vault.',
    details: [
      'Active contingency countdowns for inspection windows, financing commitments, and earnest money release ("goes hard" alerts).',
      'Secure Document Vault with cryptographic verification states for title commitments, environmental reviews, and lender packages.',
      'Phase-gate governance ensures no deal advances until all critical funding milestones are cleared.',
    ],
    keyOutcome:
      'Eliminate the risk of forfeited earnest money or missed contract deadlines during the closing window.',
    frequentlyAskedQuestions: [
      {
        question: 'What happens when earnest money goes hard?',
        answer:
          'PaperWorking sends automated advance alerts 72h, 48h, and 24h before contingency expiration so you can either sign off, request an extension, or exit safely.',
      },
    ],
    links: [{ label: 'Document Vault Guidelines', href: '/support' }],
  },
  {
    id: 'hold-phase-draws-vendor',
    category: 'lifecycle',
    title: 'Hold Phase, Holding Cost Clock, Contractor Draws & Vendor Marketplace',
    summary:
      'Control rehab execution with live budget-vs-actual tracking, daily holding burn monitoring, and scoped contractor draw workflows.',
    details: [
      'The Holding Cost Clock calculates daily capital burn (interest, taxes, insurance, utilities) so delays show tangible dollar costs.',
      'Budget-vs-actual variance highlights overruns before they compound.',
      'Contractor Draw Workflow: contractors receive scoped access to submit milestone completion and invoices, without seeing overall project equity or financials. Draws remain pending until owner or authorized team member approves.',
      'Vendor Marketplace integration connects you directly with vetted local trades and general contractors mid-rehab.',
    ],
    keyOutcome:
      'Keep rehab projects on schedule and budget by catching cost overruns early and executing milestone-based draw payments.',
    frequentlyAskedQuestions: [
      {
        question: 'Can contractors see my project financial returns or investor equity?',
        answer:
          'Never. Contractors receive strictly scoped portal access showing only their assigned scope of work, milestone checklist, and submitted draw invoices.',
      },
      {
        question: 'How are contractor draws approved?',
        answer:
          'Draws sit in pending status until the Project owner or an authorized Investment Team member reviews lien waivers and photos, then signs off for disbursement.',
      },
    ],
    links: [{ label: 'Vendor Portal Overview', href: '/vendor-portal' }],
  },
  {
    id: 'exit-phase-reporting',
    category: 'lifecycle',
    title: 'Exit Phase, Lender Packages, CPA Exports & 1031 Exchange',
    summary:
      'Prepare lender-grade performance packages, generate Schedule E / Form 4797 tax exports, and execute 1031 exchange rollover plans with complete audit trails.',
    details: [
      'Generates lender-grade packages with Net Operating Income (NOI), Debt Service Coverage Ratio (DSCR), and Equity Multiple.',
      'One-click CPA-ready exports mapped to IRS Schedule E (rental properties) and Form 4797 (sales of business property).',
      'Immutable audit trail recording every transaction, draw, and phase transition for compliance and tax audits.',
      'Structured 1031 exchange identification and timeline tracking to defer capital gains into target replacement assets.',
    ],
    keyOutcome:
      'Reduce CPA fees, eliminate tax preparation scramble, and maximize post-sale capital retention through disciplined 1031 execution.',
    frequentlyAskedQuestions: [
      {
        question: 'Are exports formatted for my CPA?',
        answer:
          'Yes. PaperWorking generates Schedule E and Form 4797-mapped CSVs and P&L packages that your CPA can import directly into tax prep software.',
      },
    ],
    links: [{ label: 'Reports Hub', href: '/dashboard/reports' }],
  },
  {
    id: 'portfolio-insights-33-kpis',
    category: 'financial',
    title: 'Portfolio Dashboard & The Playbook (33 Investor KPIs)',
    summary:
      'Monitor portfolio-wide equity, average cap rate against baseline, DSCR safe zones, and net cash flow across all active Projects.',
    details: [
      'Aggregates 33 investor metrics across Financial Performance, Operational Efficiency, Asset Management, and Risk & Compliance.',
      'Ava always links directly to the official Playbook (/support/metrics) for exact metric definitions and formulas rather than reciting raw math from memory.',
      'DSCR Safe Zone indicators alert you before debt covenants are breached.',
    ],
    keyOutcome:
      'Spot underperforming properties and capital inefficiencies before the quarterly report arrives.',
    playbookLink: '/support/metrics',
    frequentlyAskedQuestions: [
      {
        question: 'Where can I see the formulas for all 33 metrics?',
        answer:
          'Check out the public PaperWorking Playbook at /support/metrics for the complete reference, including benchmark targets and mathematical definitions.',
      },
    ],
    links: [
      { label: 'The Playbook (33 Metrics)', href: '/support/metrics' },
      { label: 'Portfolio Insights', href: '/dashboard/insights' },
    ],
  },
  {
    id: 'phase-gates-governance',
    category: 'operations',
    title: 'Phase Gates & Override Governance',
    summary:
      'Understand why a Deal is blocked at a phase gate, how hurdle checks safeguard capital, and how authorized overrides work.',
    details: [
      'Deals cannot advance to the next lifecycle phase (Acquisition → Fund → Hold → Exit) if mandatory milestones or hurdle criteria fail.',
      'Top FAQ: "Why can\'t I advance past this gate?" Typical reasons: pending title clearance, missing proof of funds, or incomplete inspection checklist.',
      'Overrides are permitted only for Lead Investor / Admin roles on Investment Team and Investor accounts, and every override is logged to the permanent audit trail.',
    ],
    keyOutcome:
      'Prevent catastrophic oversights by enforcing disciplined gate progression while retaining executive override flexibility.',
    frequentlyAskedQuestions: [
      {
        question: 'Why can’t I advance past this gate?',
        answer:
          'A phase gate blocks advancement when required checklist items (like title sign-off, appraisal review, or inspection resolutions) are incomplete. Review the phase checklist on the Project workspace to see uncompleted blockers, or use an authorized manager override if appropriate.',
      },
    ],
    links: [{ label: 'Phase Gate Rules', href: '/support' }],
  },
  {
    id: 'plaid-integration-ledger',
    category: 'financial',
    title: 'Plaid Bank Integration & Revenue vs. Liability Classification',
    summary:
      'Optional per-user bank feed syncing with automated categorization into revenue vs. liability/expense.',
    details: [
      'Plaid syncs bank and credit accounts securely and detects recurring transactions.',
      'Transactions are automatically classified into revenue (rent, tenant fees) vs. liability/expense (mortgage debt service, insurance, property management fees, utilities).',
      'Top FAQ: "Why is this recurring charge a liability?" A debt service payment or insurance premium is an ongoing liability/expense, not revenue. Users can reclassify any transaction in the Ledger with one click.',
      'CSV import and manual transaction logging are fully supported as non-bank alternatives.',
    ],
    keyOutcome:
      'Maintain real-time P&L accuracy with automated bank feeds while retaining complete control over transaction classification.',
    frequentlyAskedQuestions: [
      {
        question: 'Why is this recurring charge classified as a liability or expense?',
        answer:
          'PaperWorking classifies debt service, loan amortization, property insurance, and recurring utility charges as liabilities or operating expenses. If a recurring charge was misclassified (e.g. rent mistaken for a refund), click the transaction in your Ledger and select Reclassify.',
      },
      {
        question: 'Do I have to connect my bank account?',
        answer:
          'No, Plaid is completely optional. You can upload CSV bank exports or enter transactions manually anytime.',
      },
    ],
    links: [{ label: 'Ledger & Transactions', href: '/dashboard' }],
  },
  {
    id: 'migration-story-spreadsheets',
    category: 'operations',
    title: 'Switching From Spreadsheets Mid-Deal (Under 20 Minutes)',
    summary:
      'The #1 objection killer: you do not need to wait for a clean quarter or a new acquisition to move from spreadsheets to PaperWorking.',
    details: [
      'Enter today’s current numbers directly into the Project workspace.',
      'Set the deal start date to your original contract execution date.',
      'Import your historical expenses and rent roll via standard CSV.',
      'Your workspace, budget-vs-actual variance, and Holding Cost Clock become operational in under 20 minutes.',
    ],
    keyOutcome:
      'Eliminate migration hesitation and gain real-time visibility on your in-flight deals today.',
    frequentlyAskedQuestions: [
      {
        question: 'Can I move an active deal that is already halfway through rehab?',
        answer:
          'Yes! Set your start date to the contract date, plug in your approved rehab budget and expenses to date via CSV, and PaperWorking immediately calculates your remaining burn and projected returns.',
      },
    ],
    links: [{ label: 'Start First Project', href: '/projects/new' }],
  },
  {
    id: 'multi-entity-collaboration',
    category: 'operations',
    title: 'Multi-Entity LLCs & Team Collaboration',
    summary:
      'Tag Deals to owning LLC entities, grant read-only CPA seats, and assign scoped roles across your investment team.',
    details: [
      'Each Deal can be tagged to a specific owning LLC for per-entity reporting, P&L isolation, and tax separation.',
      'Read-only CPA collaborator seats are included on Investor and Investment Team plans at no extra charge.',
      'Investment Team roles: Lead Investor, Partner, CPA, Contractor.',
      'Automated Google Drive folder provisioning on Investment Team plans for organized deal room document storage.',
    ],
    keyOutcome:
      'Manage complex multi-entity portfolios cleanly and collaborate securely with external partners.',
    frequentlyAskedQuestions: [
      {
        question: 'Does my CPA take up a paid user seat?',
        answer:
          'No. Both Investor and Investment Team plans include dedicated read-only CPA collaborator seats so your accountant can review reports without consuming your team quota.',
      },
    ],
    links: [{ label: 'Team Settings', href: '/dashboard/team' }],
  },
  {
    id: 'offline-behavior-uat',
    category: 'operations',
    title: 'Offline Behavior & Acceptance Testing (UAT)',
    summary:
      'Walkthrough job sites without connectivity using cached deal structures, and verify platform features using acceptance-style steps.',
    details: [
      'Checklists, property details, and deal structures are cached locally in browser storage so you can inspect properties offline.',
      'Syncing, Plaid refreshes, and messaging require active connectivity and resume automatically when reconnected.',
      'Ava can guide users through acceptance testing steps: "Open the Deal Calculator → enter an address → verify cap rate renders".',
    ],
    keyOutcome:
      'Confidently use PaperWorking on-site during property walkthroughs even in areas with poor cellular service.',
    frequentlyAskedQuestions: [
      {
        question: 'Can I use PaperWorking in basements or rural job sites without cellular signal?',
        answer:
          'Yes. Your active deal checklists and property data are cached locally for offline walkthroughs. Any notes or photo uploads queue locally and sync once you are back online.',
      },
    ],
    links: [{ label: 'Acceptance Walkthrough', href: '/support' }],
  },
  {
    id: 'plans-policies-truth',
    category: 'platform',
    title: 'Plans, Pricing & Billing Policies',
    summary:
      'Official, unchangeable subscription pricing and customer-first billing policies quoted directly from versioned configuration.',
    details: [
      `Investor Plan: ${AVA_CONFIG.pricing.investor.billingText} — for individual investors wanting full pipeline visibility.`,
      `Investment Team Plan: ${AVA_CONFIG.pricing.investmentTeam.billingText} — for syndicates and teams requiring up to 10 accounts, role permissions, and emergency priority support.`,
      `Vendor Plan: ${AVA_CONFIG.pricing.vendor.billingText} — for contractors and service providers accessing the marketplace and assigned scopes.`,
      '14-day free trial on all plans; card is not charged until day 15.',
      'Switch between annual and monthly billing at any time.',
      'Self-serve cancellation anytime at Dashboard → Settings → Billing.',
      '30-day money-back guarantee on annual plans.',
      '90-day read-only data access post-cancellation so you can export records without losing historical context.',
    ],
    keyOutcome:
      'Complete transparency and no lock-in anxiety for evaluating PaperWorking.',
    frequentlyAskedQuestions: [
      {
        question: 'What happens if I cancel my subscription?',
        answer:
          'You retain full read-only access to your deals, documents, and historical reports for 90 days following cancellation so you can export your data at your convenience.',
      },
      {
        question: 'Can I switch from monthly to annual billing?',
        answer:
          'Yes, switch anytime in Dashboard → Settings → Billing. Any unused monthly time is prorated toward your annual plan.',
      },
    ],
    links: [{ label: 'Pricing Overview', href: '/pricing' }],
  },
];
