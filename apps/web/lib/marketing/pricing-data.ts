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
    annualPrice: 499,
    highlighted: false,
    features: [
      'Four-phase REIL project management',
      'All 33 KPI visualizations, per deal and portfolio-wide',
      'Deal Analyzer with live property data (cap rate, IRR, cash-on-cash)',
      'Ledger, expense logging, budgets, and Holding Cost Clock',
      'Document vault and deal uploads',
      'Tax-ready reports and CPA-ready P&L export',
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
    badge: 'Most popular',
    tagline: 'Role-based access and clean separation between what each person can see and do.',
    monthlyPrice: 99,
    annualPrice: 999,
    highlighted: true,
    features: [
      'Everything in Investor',
      'Up to 10 accounts on one team',
      'Lead Investor task assignment and phase control',
      'Role permissions: Admins, Editors, Viewers. Invite your CPA or private lenders as read-only',
      'Represent your team or company in the marketplace',
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
      'Access to assigned project work: pipelines, ledger entries, budgets for your scope',
      'Standard financial reports',
    ],
    cta: 'Join the Marketplace',
    microcopy: '14-day trial · No charge until day 15',
    ctaHref: '/login?mode=signup&accountType=vendor&redirectTo=/vendor-portal',
  },
];

export const PRICING_FAQ = [
  {
    question: 'Is there a free trial?',
    answer: 'Every plan includes a 14-day trial. Billing starts on day 15 unless you cancel.',
  },
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes — upgrade or downgrade through billing settings. Stripe proration applies on the migrated stack.',
  },
  {
    question: 'Do vendors need an investor plan?',
    answer: 'No. Vendors subscribe to the Vendor tier for portal access and quote workflows only.',
  },
] as const;

export function formatMonthlyEquiv(annualPrice: number): string {
  return `$${(annualPrice / 12).toFixed(2)}`;
}
