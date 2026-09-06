export interface NavLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

export const MARKETING_NAV_LINKS: NavLink[] = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Marketplaces', href: '/marketplaces' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
  { label: 'Contact', href: '/contact' },
];

/** Footer columns — matches PaperWorking v0 LandingFooter. */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Marketplaces', href: '/marketplaces' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Support Center', href: '/support' },
      { label: 'Real Estate Glossary', href: '/support/glossary' },
      { label: 'The Playbook (33 Metrics)', href: '/support/metrics' },
      { label: 'Knowledge Base', href: '/help' },
      { label: 'Blog', href: '/help' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Start Free 14-Day Trial', href: '/pricing' },
      { label: 'Sign In', href: '/login' },
      { label: 'Create Account', href: '/signup' },
      { label: 'Forgot Password', href: '/forgot-password' },
      { label: 'Accept Team Invite', href: '/signup' },
    ],
  },
  {
    heading: 'Company & Legal',
    links: [
      { label: 'About', href: '/contact' },
      { label: 'Careers', href: '/contact' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/privacy' },
      { label: 'Subprocessors', href: '/privacy' },
    ],
  },
];

export const FOOTER_BOTTOM_LINKS: NavLink[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/privacy' },
  { label: 'Subprocessors', href: '/privacy' },
];

export const HERO_CONTENT = {
  eyebrow: 'Precision deal management',
  headline: 'Run every real estate deal from acquisition to exit',
  subheadline:
    'PaperWorking gives serious investors one workspace for underwriting, funding, hold management, and exit planning — without spreadsheets scattered across inboxes.',
  primaryCta: { label: 'Start 14-Day Free Trial', href: '/pricing' },
  secondaryCta: { label: 'Explore Support', href: '/support' },
} as const;

export const VALUE_PROPS = [
  {
    title: 'REIL lifecycle tracking',
    description:
      'Mirror how investors actually work: Acquisition, Fund, Hold, and Exit — with phase-aware dashboards and deadlines.',
  },
  {
    title: 'Canonical financial metrics',
    description:
      'One authoritative engine for IRR, equity multiple, cash-on-cash, and hold-period projections across your portfolio.',
  },
  {
    title: 'Investor-grade support',
    description:
      'Problem-centric help center, tiered support channels, and operational status — built for deals that do not wait.',
  },
] as const;

export const REIL_PHASE_LABELS: Record<string, { title: string; summary: string }> = {
  ACQUISITION: {
    title: 'Acquisition',
    summary: 'Source, underwrite, and compare deals before you commit capital.',
  },
  FUND: {
    title: 'Fund',
    summary: 'Track lender packages, loan estimates, and closing readiness in one place.',
  },
  HOLD: {
    title: 'Hold',
    summary: 'Monitor performance, capex, and registry milestones while you operate.',
  },
  EXIT: {
    title: 'Exit',
    summary: 'Plan dispositions, model proceeds, and close with a complete audit trail.',
  },
};
