export interface SupportCategory {
  id: string;
  title: string;
  tagline: string;
  description: string;
}

export interface SupportFaq {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
}

export interface ContactChannel {
  id: string;
  label: string;
  tier: string;
  headline: string;
  description: string;
  href: string;
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'first-deal',
    title: 'Setting Up Your First Deal',
    tagline: 'Go from signup to a fully tracked deal in 15 minutes.',
    description:
      'Create your workspace, add a property, run your first analysis, and get your dashboard live before your next showing.',
  },
  {
    id: 'underwriting',
    title: 'Underwriting & Metrics',
    tagline: 'Trust the numbers before you wire funds.',
    description:
      'Understand how PaperWorking calculates IRR, equity multiple, and hold-period projections from your inputs.',
  },
  {
    id: 'funding',
    title: 'Funding & Closing',
    tagline: 'Keep lender packages and deadlines aligned.',
    description:
      'Organize loan estimates, lender checklists, and closing tasks without losing context between phases.',
  },
  {
    id: 'hold-exit',
    title: 'Hold & Exit Planning',
    tagline: 'Operate and exit with a complete audit trail.',
    description:
      'Track hold registry milestones, model dispositions, and export reporting when investors or CPAs need answers.',
  },
];

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: 'faq-trial',
    categoryId: 'first-deal',
    question: 'How does the 14-day free trial work?',
    answer:
      'Start on any paid plan without entering a card on day one. Your workspace provisions immediately so you can import a deal and explore the REIL lifecycle.',
  },
  {
    id: 'faq-reil',
    categoryId: 'underwriting',
    question: 'What is the REIL framework?',
    answer:
      'REIL stands for Acquisition, Fund, Hold, and Exit — the four phases serious investors use to manage a deal from first look through disposition.',
  },
  {
    id: 'faq-metrics',
    categoryId: 'underwriting',
    question: 'Where do financial metrics come from?',
    answer:
      'PaperWorking derives portfolio metrics from a single canonical engine so dashboards, reports, and exports stay consistent.',
  },
  {
    id: 'faq-support-email',
    categoryId: 'first-deal',
    question: 'How do I reach support?',
    answer:
      'Email hi@paperworking.co for all plans. Investor and Team tiers include live chat; Investment Team accounts get priority response during business hours.',
  },
];

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: 'email',
    label: 'Email Support',
    tier: 'All plans',
    headline: 'hi@paperworking.co',
    description:
      'A real person answers every message. Send your deal details and we jump straight to the issue.',
    href: 'mailto:hi@paperworking.co',
  },
  {
    id: 'chat',
    label: 'Live Chat',
    tier: 'Investor & Team',
    headline: 'Talk to a real person',
    description:
      'Investor and Investment Team accounts get live chat — response in under 30 minutes during business hours.',
    href: '/account/support',
  },
  {
    id: 'priority',
    label: 'Priority Support',
    tier: 'Investment Team only',
    headline: "Dedicated line — deals don't wait",
    description:
      "Investment Team accounts get a direct line. If you're mid-closing and something breaks, we pick up.",
    href: '/account/support',
  },
];

export const SYSTEM_STATUS = {
  status: 'operational' as const,
  message: 'All systems operational',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

export const POPULAR_SEARCHES = [
  'first deal setup',
  'IRR calculation',
  'loan estimates',
  'export reports',
  'team invite',
];
