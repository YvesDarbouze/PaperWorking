export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'first-deal-setup',
    title: 'Set up your first deal',
    category: 'Getting started',
    summary: 'Create a project, enter acquisition assumptions, and open the scorecard.',
    body: 'From the dashboard, open Projects and create a new deal. Enter purchase price, rehab budget, and disposition strategy. The scorecard derives KPIs from the canonical financial engine automatically.',
  },
  {
    slug: 'irr-and-metrics',
    title: 'Understanding IRR and the 33 KPIs',
    category: 'Metrics',
    summary: 'How PaperWorking calculates portfolio and project metrics.',
    body: 'All scorecard values flow through deriveAllProjectMetrics(). Portfolio rollups aggregate per-project NOI, cap rate, and cash flow. Insights surfaces persona-weighted KPI categories for your active projects.',
  },
  {
    slug: 'vendor-quotes',
    title: 'Responding to vendor quote requests',
    category: 'Vendor portal',
    summary: 'Accept, quote, or decline investor requests from the vendor inbox.',
    body: 'Vendors sign in at /vendor-portal to view open requests. Submit a quoted fee and message; investors see updates on the project documents workflow.',
  },
  {
    slug: 'workspace-settings-and-preferences',
    title: 'Workspace settings, security, and directory skills',
    category: 'Settings',
    summary: 'Configure general workspace preferences, vendor directory skills, security credentials, billing, and data privacy.',
    body: 'Open Settings from the dashboard sidebar to manage your profile details, time zone, currency, and notification preferences. In the General tab, you can also select and save Vendor Directory skills so investors can discover your services in the marketplace. Use the Security, Billing, and Data & Privacy tabs to manage authentication, subscriptions, and workspace data.',
  },
  {
    slug: 'billing-and-plans',
    title: 'Billing, trials, and plan changes',
    category: 'Account',
    summary: 'Manage subscription tiers and payment methods.',
    body: 'Investor, Investment Team, and Vendor tiers map to Stripe checkout. Manage active plans, payment methods, and invoices from the Billing tab in Settings.',
  },
  {
    slug: 'admin-agent-crew',
    title: 'Admin: synthetic agent crew',
    category: 'Admin',
    summary: 'QA synthetic personas and impersonation for platform admins.',
    body: 'Platform admins access /admin/agent-crew to inspect synthetic agents, impersonate for QA, and purge test data. Impersonation sets auditable session cookies and redirects to the investor dashboard.',
  },
];

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.slug === slug);
}
