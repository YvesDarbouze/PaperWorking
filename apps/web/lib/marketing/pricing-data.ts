export interface PricingPlan {
  id: string;
  stripeKey: string;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  cta: string;
  microcopy: string;
  ctaHref: string;
  highlighted?: boolean;
}

/** Plan catalog — matches PaperWorking v0 PricingSection + PLAN_CATALOG. */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'individual',
    stripeKey: 'Investor',
    name: 'Investor',
    tagline: 'Full pipeline visibility without a team subscription.',
    monthlyPrice: 59,
    annualPrice: 590,
    highlighted: false,
    features: [
      'Bloomberg Terminal for Real Estate Investors (solo operator toolset)',
      'Four-phase REIL project management',
      'All 33 KPI visualizations',
      'Deal Calculator with live property data',
      'Ledger/expense logging/budgets/Holding Cost Clock',
      'Document vault',
      'Tax-ready reports',
      'Deal Marketplace access',
      'Solo plan: one user account',
    ],
    cta: 'Start Investor Trial',
    microcopy: '14-day trial · No charge until day 15 · Export your data anytime',
    ctaHref: '/login?mode=signup&accountType=investor&redirectTo=/pricing',
  },
  {
    id: 'team',
    stripeKey: 'Investment Team',
    name: 'Investment Team',
    badge: 'MOST POPULAR',
    tagline: 'Role-based access and clean separation between what each person can see and do.',
    monthlyPrice: 99,
    annualPrice: 990,
    highlighted: true,
    features: [
      'Bloomberg Terminal for Real Estate Investors (multi-seat firm workspace)',
      'Everything in Investor',
      'Up to 10 accounts included',
      'Lead Investor task assignment',
      'Role permissions (Admins, Editors, Viewers)',
      'Represent team in marketplace',
      'Google Drive provisioning',
    ],
    cta: 'Start Team Trial',
    microcopy: '14-day trial · No charge until day 15 · Export your data anytime',
    ctaHref: '/login?mode=signup&accountType=investor&redirectTo=/pricing',
  },
  {
    id: 'vendor',
    stripeKey: 'Vendor',
    name: 'Vendor',
    tagline: 'Qualified leads from active investor projects in your service area.',
    monthlyPrice: 39,
    annualPrice: 390,
    highlighted: false,
    features: [
      'Vendor Marketplace listing by trade and geography',
      'Access to assigned project work',
      'Standard financial reports',
    ],
    cta: 'Join the Marketplace',
    microcopy: '14-day trial · No charge until day 15',
    ctaHref: '/login?mode=signup&accountType=vendor&redirectTo=/vendor-portal',
  },
];

export interface ComparisonFeature {
  name: string;
  investor: boolean | string;
  team: boolean | string;
  vendor: boolean | string;
}

export interface ComparisonCategory {
  title: string;
  features: ComparisonFeature[];
}

export const PRICING_COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    title: 'Core Real Estate Investment Lifecycle (REIL)',
    features: [
      { name: '4-Phase REIL Project Workspaces (Acquisition, Fund, Hold, Exit)', investor: true, team: true, vendor: 'Assigned Scopes' },
      { name: 'Deal Calculator & Live Property Underwriting', investor: true, team: true, vendor: false },
      { name: 'Contingency Alerts & Earnest Money Vault', investor: true, team: true, vendor: false },
      { name: 'Budget vs. Actuals & Contractor Draw Ledger', investor: true, team: true, vendor: 'Draw Invoicing' },
      { name: 'Holding Cost Clock & Daily Carry Burn Rate', investor: true, team: true, vendor: false },
      { name: 'Exit Disposition Package & Schedule E Tax Export', investor: true, team: true, vendor: 'P&L Reports' },
    ],
  },
  {
    title: 'Data & Financial Intelligence',
    features: [
      { name: '33 Visualized KPIs & Institutional Gauges', investor: true, team: true, vendor: false },
      { name: 'Live Property Comps & Automated Valuation Model (AVM)', investor: true, team: true, vendor: false },
      { name: 'Consolidated Multi-Property Portfolio Dashboard', investor: true, team: true, vendor: false },
      { name: 'One-Click Data & Financial Export (CSV, PDF, Excel)', investor: true, team: true, vendor: true },
    ],
  },
  {
    title: 'Team, Roles & Governance',
    features: [
      { name: 'Included User Accounts', investor: '1 Solo Account', team: 'Up to 10 Accounts', vendor: '1 Vendor Account' },
      { name: 'Lead Investor Project & Phase Assignment Controls', investor: false, team: true, vendor: false },
      { name: 'Granular Role Permissions (Admins, Partners, Viewers)', investor: false, team: true, vendor: false },
      { name: 'CPA & Advisor View-Only Read Permissions', investor: false, team: true, vendor: false },
      { name: 'Centralized Google Drive Vault Provisioning', investor: false, team: true, vendor: false },
    ],
  },
  {
    title: 'Marketplaces & Ecosystem',
    features: [
      { name: 'Deal Marketplace (Co-investor soft pledges & syndication)', investor: true, team: true, vendor: false },
      { name: 'Vendor Marketplace (Find vetted contractors, lawyers, bankers)', investor: true, team: true, vendor: false },
      { name: 'Directory Listing & Qualified Investor Deal Leads', investor: false, team: 'Firm Profile', vendor: 'Service Directory' },
    ],
  },
  {
    title: 'Security, Support & Integrations',
    features: [
      { name: 'Plaid Bank Feed & Connected Account Sync', investor: true, team: true, vendor: false },
      { name: 'Bank-Grade 256-Bit TLS Encryption & Data Isolation', investor: true, team: true, vendor: true },
      { name: 'Pepper AI Intelligent Support Assistant', investor: true, team: true, vendor: true },
      { name: 'Dedicated Support & Priority Call-Backs', investor: 'Standard Email', team: 'Priority Support', vendor: 'Standard Email' },
    ],
  },
];

export const PRICING_FAQ = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'Every plan includes full access for 14 days. You can test live deals, connect bank accounts via Plaid, and use the Deal Calculator immediately. Your card will not be charged until day 15, and you can cancel anytime with one click in Settings.',
  },
  {
    question: 'Can I add or remove team members later?',
    answer: 'Yes. The Investment Team plan includes up to 10 accounts with custom roles. The Lead Investor can invite or reassign seats at any time without additional per-seat fees.',
  },
  {
    question: 'Do CPAs or contractors need their own paid subscription?',
    answer: 'No. On an Investment Team plan, you can invite your CPA with view-only permissions or assign vendors to specific milestone draw tickets without them needing separate investor subscriptions.',
  },
  {
    question: 'What is the difference between Investor and Investment Team plans?',
    answer: 'The Investor plan is engineered for solo real estate operators managing their own portfolio. The Investment Team plan adds multi-user governance, Lead Investor role assignments, CPA view-only access, Google Drive provisioning, and firm marketplace profiles.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'You retain full ownership of your data. You can export complete project archives, document vaults, budgets, and P&L ledgers to CSV, Excel, or PDF before canceling.',
  },
  {
    question: 'Can I switch between monthly and annual billing?',
    answer: 'Yes. You can upgrade, downgrade, or switch billing intervals in your Billing Settings at any time. Stripe automatically prorates any balance.',
  },
] as const;

export function formatMonthlyEquiv(annualPrice: number): string {
  return `$${(annualPrice / 12).toFixed(2)}`;
}
