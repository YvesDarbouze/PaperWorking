/* ═══════════════════════════════════════════════════════
   PaperWorking Support Data — Problem-Centric Architecture

   Organization principle: categories and articles are named
   after INVESTOR GOALS, not product feature names.
   "Tracking deadlines" not "Transaction Module".
   "Working with your CPA" not "Export Features".

   Applied from: docs-architect + customer-support skills.
   ═══════════════════════════════════════════════════════ */

// ── Interfaces ──────────────────────────────────────────

export interface SupportCategory {
  id: string;
  title: string;
  tagline: string;           // one-line investor benefit
  description: string;
  icon: string;              // Material Symbols name
  color: string;             // Tailwind color class
  articleCount: number;
}

export interface SupportArticle {
  id: string;
  categoryId: string;
  title: string;             // written as an investor problem/goal
  excerpt: string;
  readTime: string;
  tags: string[];
  popular?: boolean;         // surfaces in popular articles strip
  content?: string;
}

export interface SupportFAQ {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
}

// ── Categories — problem-centric ────────────────────────

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'first-deal',
    title: 'Setting Up Your First Deal',
    tagline: 'Go from signup to a fully tracked deal in 15 minutes.',
    description:
      'Create your workspace, add a property, run your first deal analysis, and get your dashboard live before your next showing.',
    icon: 'add_home_work',
    color: 'text-primary',
    articleCount: 8,
  },
  {
    id: 'deadlines',
    title: 'Tracking Deadlines & Contingencies',
    tagline: "Never miss an inspection window or earnest money date.",
    description:
      'Set up deadline alerts, configure contingency timelines, and understand what happens when a deadline changes after contract execution.',
    icon: 'alarm',
    color: 'text-secondary',
    articleCount: 7,
  },
  {
    id: 'rehab',
    title: 'Managing Your Rehab Budget',
    tagline: 'Watch margin in real time — not at reconciliation.',
    description:
      'Add trades to your budget, log contractor invoices, approve draw requests, and see your variance the moment it happens.',
    icon: 'construction',
    color: 'text-tertiary',
    articleCount: 9,
  },
  {
    id: 'cpa',
    title: 'Working With Your CPA',
    tagline: 'Hand your CPA one organized file, not a shoebox.',
    description:
      'Generate your P&L export, understand what goes in each line item, and set up cost basis tracking from day one of the deal.',
    icon: 'receipt_long',
    color: 'text-primary',
    articleCount: 6,
  },
  {
    id: 'partners',
    title: 'Partners, Team Members & LP Access',
    tagline: 'Give the right people the right level of visibility.',
    description:
      'Invite co-investors, assign team roles, grant read-only access to passive investors, and manage who can approve draws.',
    icon: 'group',
    color: 'text-outline',
    articleCount: 5,
  },
  {
    id: 'billing',
    title: 'Billing & Subscription',
    tagline: 'Transparent billing with no surprises.',
    description:
      'Upgrade or downgrade your plan, download invoices, understand what happens to your data if you cancel, and manage payment methods.',
    icon: 'credit_card',
    color: 'text-on-surface-variant',
    articleCount: 6,
  },
];

// ── Articles — investor-language titles ─────────────────

export const SUPPORT_ARTICLES: SupportArticle[] = [
  // First Deal Setup
  {
    id: 'create-first-deal',
    categoryId: 'first-deal',
    title: 'How do I add my first property and run a deal analysis?',
    excerpt:
      'Walk through creating a deal from scratch — entering the address, purchase price, ARV, and rehab budget to get your first IRR and cap rate calculation.',
    readTime: '4 min read',
    tags: ['getting started', 'deal analyzer', 'IRR', 'cap rate'],
    popular: true,
  },
  {
    id: 'deal-analyzer-fields',
    categoryId: 'first-deal',
    title: 'What does each field in the Deal Analyzer mean?',
    excerpt:
      'Plain-English explanations of ARV, IRR, CoC return, cap rate, and equity multiple — and how PaperWorking calculates each one.',
    readTime: '6 min read',
    tags: ['deal analyzer', 'IRR', 'definitions'],
    popular: true,
  },
  {
    id: 'import-existing-deal',
    categoryId: 'first-deal',
    title: "I'm mid-deal already. Can I import my existing data?",
    excerpt:
      'Yes. Learn how to enter a deal that is already in progress — what to enter for costs already incurred and how to set the start date correctly.',
    readTime: '5 min read',
    tags: ['import', 'mid-deal', 'getting started'],
  },
  {
    id: 'account-setup',
    categoryId: 'first-deal',
    title: 'Setting up your account: profile, workspace, and notifications',
    excerpt:
      'Configure your investor profile, set your default deal currency, and choose which alert types you want sent by email vs. in-app.',
    readTime: '3 min read',
    tags: ['account', 'settings', 'notifications'],
  },
  {
    id: 'mobile-access',
    categoryId: 'first-deal',
    title: 'How do I access PaperWorking on my phone during a walkthrough?',
    excerpt:
      'PaperWorking is fully mobile-responsive. Add it to your home screen as a PWA and access deal data, deadlines, and budgets from any device.',
    readTime: '2 min read',
    tags: ['mobile', 'PWA', 'access'],
  },

  // Deadlines & Contingencies
  {
    id: 'contingency-setup',
    categoryId: 'deadlines',
    title: 'How do I set up contingency deadlines from my contract?',
    excerpt:
      'Enter your contract execution date and PaperWorking auto-calculates your inspection, financing, and appraisal windows. Learn how to override any date.',
    readTime: '5 min read',
    tags: ['contingency', 'deadline', 'inspection period'],
    popular: true,
  },
  {
    id: 'earnest-money-alert',
    categoryId: 'deadlines',
    title: 'How do I get alerted before my earnest money goes hard?',
    excerpt:
      'Configure your earnest money date alert — how many days in advance to notify you, and which channels (email + in-app) to use.',
    readTime: '3 min read',
    tags: ['earnest money', 'alert', 'deadline'],
    popular: true,
  },
  {
    id: 'contingency-extension',
    categoryId: 'deadlines',
    title: 'My contingency period was extended. How do I update the timeline?',
    excerpt:
      'Amending a contingency date updates all dependent deadlines automatically. Learn how to log a contract amendment and see what changes.',
    readTime: '4 min read',
    tags: ['amendment', 'contingency', 'deadline change'],
  },
  {
    id: 'missed-deadline',
    categoryId: 'deadlines',
    title: "I missed a deadline — what happens in the system?",
    excerpt:
      'Overdue deadlines are flagged in your deal dashboard. Learn how to mark them resolved, log what happened, and avoid the same issue on the next deal.',
    readTime: '3 min read',
    tags: ['overdue', 'missed deadline', 'resolution'],
  },

  // Rehab Budget Management
  {
    id: 'set-up-budget',
    categoryId: 'rehab',
    title: 'How do I set up my rehab budget by trade?',
    excerpt:
      'Create line items by trade (demo, electrical, HVAC, flooring, etc.), enter your estimated costs, and start tracking actuals against each line.',
    readTime: '5 min read',
    tags: ['budget', 'rehab', 'line items', 'trades'],
    popular: true,
  },
  {
    id: 'log-contractor-invoice',
    categoryId: 'rehab',
    title: 'How do I log a contractor invoice against my budget?',
    excerpt:
      'Match an invoice to a specific trade line item, attach the PDF, and watch your budget-vs-actual update in real time.',
    readTime: '4 min read',
    tags: ['invoice', 'contractor', 'budget', 'actual costs'],
  },
  {
    id: 'approve-draw-request',
    categoryId: 'rehab',
    title: "My contractor submitted a draw request. How do I approve it?",
    excerpt:
      'Draw requests appear in your deal dashboard for review. Approve, deny, or request a revision — with full audit trail attached to the deal.',
    readTime: '4 min read',
    tags: ['draw request', 'contractor', 'approval'],
  },
  {
    id: 'change-order',
    categoryId: 'rehab',
    title: 'How do I log a change order that increases my budget?',
    excerpt:
      'Change orders add to your approved budget. Learn how to document them, see the impact on your projected margin, and get LP sign-off if needed.',
    readTime: '5 min read',
    tags: ['change order', 'budget', 'scope change'],
  },
  {
    id: 'over-budget-alert',
    categoryId: 'rehab',
    title: "I'm over budget on a trade line. What do I do?",
    excerpt:
      'PaperWorking flags variance automatically. Learn how to reallocate budget from another line, add contingency funds, and document the decision.',
    readTime: '4 min read',
    tags: ['over budget', 'variance', 'contingency fund'],
  },

  // CPA Export & Tax Prep
  {
    id: 'generate-pl-export',
    categoryId: 'cpa',
    title: 'How do I generate a P&L export for my CPA?',
    excerpt:
      'One-click export from your deal dashboard. Learn which costs are included, how the categories map to Schedule E or Form 4797, and how to add the file to your CPA handoff.',
    readTime: '5 min read',
    tags: ['P&L', 'export', 'CPA', 'tax'],
    popular: true,
  },
  {
    id: 'cost-basis-tracking',
    categoryId: 'cpa',
    title: 'How does PaperWorking track cost basis for tax purposes?',
    excerpt:
      'All costs entered — purchase price, rehab, carrying costs, closing costs — accumulate in your cost basis ledger. Learn what to include and what to exclude.',
    readTime: '6 min read',
    tags: ['cost basis', 'tax', 'ledger'],
  },
  {
    id: 'cpa-access',
    categoryId: 'cpa',
    title: 'Can I give my CPA read-only access to my deals?',
    excerpt:
      'Yes, on Pro and Portfolio plans. Invite your CPA as a read-only collaborator — they can view costs and download exports without being able to edit deal data.',
    readTime: '3 min read',
    tags: ['CPA', 'read-only', 'access', 'collaborator'],
  },
  {
    id: 'year-end-export',
    categoryId: 'cpa',
    title: 'How do I run a year-end report across all my deals?',
    excerpt:
      'The Portfolio Report aggregates all deals closed in a calendar year. Learn how to run it, what it includes, and how to filter by entity or deal type.',
    readTime: '4 min read',
    tags: ['year-end', 'portfolio report', 'tax prep'],
    popular: true,
  },

  // Partners & Team
  {
    id: 'invite-team-member',
    categoryId: 'partners',
    title: 'How do I invite a business partner or team member?',
    excerpt:
      'Add team members with full edit access or read-only access. Understand the difference between a team seat and a collaborator invite.',
    readTime: '4 min read',
    tags: ['team', 'invite', 'partner', 'collaborator'],
  },
  {
    id: 'lp-read-only',
    categoryId: 'partners',
    title: 'How do I give a passive investor (LP) read-only access to a deal?',
    excerpt:
      'LPs get a link to view your deal dashboard — they see cost basis, progress, and documents but cannot edit anything. No seat required.',
    readTime: '3 min read',
    tags: ['LP', 'passive investor', 'read-only', 'link share'],
  },
  {
    id: 'draw-approval-permissions',
    categoryId: 'partners',
    title: 'Who can approve draw requests on a deal?',
    excerpt:
      'By default, the deal owner and any team member with editor access can approve draws. Learn how to restrict draw approvals to specific users.',
    readTime: '3 min read',
    tags: ['draw approval', 'permissions', 'roles'],
  },

  // Billing
  {
    id: 'upgrade-plan',
    categoryId: 'billing',
    title: 'How do I upgrade from Starter to Pro or Portfolio?',
    excerpt:
      'Upgrade from Settings → Billing. The cost is prorated for the remainder of your billing period and your data is instantly available on the new plan.',
    readTime: '3 min read',
    tags: ['upgrade', 'plan', 'billing'],
  },
  {
    id: 'cancel-subscription',
    categoryId: 'billing',
    title: 'What happens to my deal data if I cancel?',
    excerpt:
      'Your data is never deleted at cancellation. You get 90 days of read-only access and can export everything as CSV at any time. After 90 days, you can reactivate.',
    readTime: '3 min read',
    tags: ['cancel', 'data', 'export', 'subscription'],
    popular: true,
  },
  {
    id: 'invoice-download',
    categoryId: 'billing',
    title: 'How do I download my invoices for reimbursement or bookkeeping?',
    excerpt:
      'All invoices are available in Settings → Billing → Invoice History. Download as PDF or have them auto-forwarded to an accounting email.',
    readTime: '2 min read',
    tags: ['invoice', 'billing', 'bookkeeping'],
  },
  {
    id: 'annual-vs-monthly',
    categoryId: 'billing',
    title: 'Is there a discount for paying annually?',
    excerpt:
      'Annual billing saves 20% vs monthly. You can switch to annual at any time — the price difference is prorated for your current period.',
    readTime: '2 min read',
    tags: ['annual', 'discount', 'billing cycle'],
  },
];

// ── Popular searches (for the search tag chips) ─────────

export const POPULAR_SEARCHES: string[] = [
  'Missed deadline',
  'CPA export',
  'Contractor draw',
  'Earnest money alert',
  'LP access',
  'Cancel subscription',
];

// ── Support FAQs — RE investor objections ───────────────

export const SUPPORT_FAQS: SupportFAQ[] = [
  {
    id: 'faq-1',
    question: "I'm in the middle of a deal. Can I switch from spreadsheets without starting over?",
    answer:
      "Yes. Enter your deal with today's numbers — purchase price, costs incurred to date, current rehab status — and set the deal start date to your contract execution date. PaperWorking doesn't require a clean start. You can be fully set up in under 20 minutes even on an active deal.",
    categoryId: 'first-deal',
  },
  {
    id: 'faq-2',
    question: 'My contractor wants to be paid before I can verify the work. How does that work?',
    answer:
      "Draw requests go into a pending state until you approve them. You can approve a partial draw while keeping the remainder in pending. If your contractor submits a request before work is verifiable, mark it as \"pending inspection\" — it stays logged but doesn't release until you approve it.",
    categoryId: 'rehab',
  },
  {
    id: 'faq-3',
    question: "My CPA has never used PaperWorking. Will they understand the export?",
    answer:
      "The P&L export is a plain CSV with labeled columns that match standard real estate accounting categories. Most CPAs recognize the format immediately. The export includes a legend sheet that maps PaperWorking categories to IRS Schedule E and Form 4797 line items. You can also invite your CPA as a read-only collaborator so they can pull their own reports.",
    categoryId: 'cpa',
  },
  {
    id: 'faq-4',
    question: "I have multiple LLCs for different deals. How does that work?",
    answer:
      "Each deal can be assigned to a different entity. In your account settings, you can add all your LLCs and tag each deal to the correct entity. The portfolio report can be filtered by entity, so your CPA can pull a clean year-end P&L for each LLC separately.",
    categoryId: 'first-deal',
  },
  {
    id: 'faq-5',
    question: "What if I lose internet access during a walkthrough?",
    answer:
      "PaperWorking caches your active deals locally when you open them. If you lose connectivity, you can still view your deal data, deadlines, and budget. Changes made offline sync automatically when connectivity is restored. We recommend opening your active deals before heading to a site where reception is unreliable.",
    categoryId: 'first-deal',
  },
];

// ── System status ────────────────────────────────────────

export interface SystemStatusItem {
  service: string;
  status: 'operational' | 'degraded' | 'outage';
}

export const SYSTEM_STATUS: SystemStatusItem[] = [
  { service: 'Deal Dashboard', status: 'operational' },
  { service: 'Document Vault', status: 'operational' },
  { service: 'Notifications & Alerts', status: 'operational' },
  { service: 'CPA Export Engine', status: 'operational' },
  { service: 'Auth & Login', status: 'operational' },
];
