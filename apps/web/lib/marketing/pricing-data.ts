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
      'Everything in Investor',
      'Up to 10 accounts',
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
