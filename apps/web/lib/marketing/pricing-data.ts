export interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  summary: string;
  features: string[];
  ctaHref: string;
  highlighted?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'individual',
    name: 'Investor',
    monthlyPrice: 59,
    annualPrice: 499,
    summary: 'Solo investors running acquisition through exit on a disciplined REIL workflow.',
    features: ['Portfolio command center', 'Project scorecard & 33 KPIs', 'Reports export', '14-day free trial'],
    ctaHref: '/login?mode=signup&accountType=investor&redirectTo=/pricing',
  },
  {
    id: 'team',
    name: 'Investment Team',
    monthlyPrice: 99,
    annualPrice: 999,
    summary: 'Teams coordinating capital, vendors, and milestones across active deals.',
    features: ['Everything in Investor', 'Team assignments & inbox', 'Shared project workspace', 'Priority support'],
    ctaHref: '/login?mode=signup&accountType=investor&redirectTo=/pricing',
    highlighted: true,
  },
  {
    id: 'vendor',
    name: 'Vendor',
    monthlyPrice: 39,
    annualPrice: 390,
    summary: 'Contractors and service providers responding to investor quote requests.',
    features: ['Vendor portal inbox', 'Profile & specialties', 'Deal-phase visibility', 'Marketplace presence'],
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
    answer: 'Yes — upgrade or downgrade through billing settings. Stripe proration applies on the migrated stack.',
  },
  {
    question: 'Do vendors need an investor plan?',
    answer: 'No. Vendors subscribe to the Vendor tier for portal access and quote workflows only.',
  },
] as const;
