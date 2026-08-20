/** Seed payloads for Portfolio Command Center visual parity with PaperWorking. */

export const PORTFOLIO_SUMMARY = {
  activeDeals: 3,
  capitalDeployed: '$1.42M',
  portfolioIrr: '17.8%',
  equityMultiple: '1.84',
  totalNoi: '$186K',
  monthlyCashFlow: '$12.4K',
  needsAttention: 2,
  portfolioValue: '$2,642,000',
  sparklineGrowth: '+12.4%',
} as const;

export const PIPELINE_SNAPSHOT = [
  {
    id: 'deal-1',
    name: '1247 Elm Street',
    city: 'Austin, TX',
    phase: 'Acquisition',
    status: 'Underwriting',
    phaseColor: '#7A9EAA',
  },
  {
    id: 'deal-2',
    name: '88 Harbor Lane',
    city: 'Tampa, FL',
    phase: 'Fund',
    status: 'Lender review',
    phaseColor: '#F06543',
  },
  {
    id: 'deal-3',
    name: '512 Oak Ridge',
    city: 'Denver, CO',
    phase: 'Hold',
    status: 'Operating',
    phaseColor: '#34d399',
  },
] as const;

export const ATTENTION_ITEMS = [
  {
    id: 'att-1',
    title: 'Loan estimate expires in 3 days',
    project: '88 Harbor Lane',
    severity: 'high' as const,
  },
  {
    id: 'att-2',
    title: 'Insurance renewal missing',
    project: '512 Oak Ridge',
    severity: 'medium' as const,
  },
] as const;

export const ASSIGNED_TASKS = [
  { id: 'task-1', title: 'Upload LOI package', project: '1247 Elm Street', done: true },
  { id: 'task-2', title: 'Review lender checklist', project: '88 Harbor Lane', done: false },
  { id: 'task-3', title: 'Schedule insurance renewal', project: '512 Oak Ridge', done: false },
] as const;

export const RECENT_MESSAGES = [
  {
    id: 'msg-1',
    from: 'Capital Partners Lending',
    preview: 'Loan estimate ready for review',
    time: '2h ago',
  },
  {
    id: 'msg-2',
    from: 'Summit Roofing Co.',
    preview: 'Vendor quote submitted — roof inspection',
    time: '1d ago',
  },
] as const;

export const PROFILE_CARD = {
  displayName: 'Dev Investor',
  company: 'Personal Workspace',
  role: 'Lead Investor',
  followers: 12,
  teamCount: 3,
  followerPreview: [
    { id: 'f1', name: 'Alex Morgan', dealName: '1247 Elm Street' },
    { id: 'f2', name: 'Jordan Lee', dealName: '88 Harbor Lane' },
  ],
} as const;

export const OPERATIONAL_ALERTS = [
  {
    id: 'plaid-connection',
    label: 'Plaid Connection Required',
    count: 1,
    actionLabel: 'Connect Bank',
    actionHref: '/dashboard/settings/billing',
    secondaryLabel: 'Manually Categorize',
    secondaryHref: '/dashboard/reports',
    tone: 'amber' as const,
  },
  {
    id: 'missed-rent',
    label: 'Missed Rent Payments',
    count: 1,
    actionLabel: 'View Details',
    actionHref: '/dashboard/reports',
    tone: 'rose' as const,
  },
] as const;

export const ACTIVE_PROJECT_PROGRESS = [
  { id: 'deal-1', name: '1247 Elm Street', phase: 'Acquisition', progress: 35 },
  { id: 'deal-2', name: '88 Harbor Lane', phase: 'Fund', progress: 62 },
  { id: 'deal-3', name: '512 Oak Ridge', phase: 'Hold', progress: 88 },
] as const;

export const TOP_PERFORMERS = [
  { id: 'deal-3', name: '512 Oak Ridge', metric: 'IRR 21.2%', note: 'Hold / Operating' },
  { id: 'deal-1', name: '1247 Elm Street', metric: 'CoC 14.8%', note: 'Acquisition' },
] as const;

export const RECENT_ACTIVITY = [
  {
    id: 'act-1',
    title: 'Loan estimate uploaded',
    detail: '88 Harbor Lane · Capital Partners',
    time: '2h ago',
  },
  {
    id: 'act-2',
    title: 'KPI snapshot recalculated',
    detail: 'Portfolio IRR → 17.8%',
    time: 'Yesterday',
  },
  {
    id: 'act-3',
    title: 'Document vault updated',
    detail: '1247 Elm Street · LOI package',
    time: '2d ago',
  },
] as const;

export const PHASE_LEGEND = [
  { label: 'Acquisition', color: '#7A9EAA' },
  { label: 'Fund', color: '#F06543' },
  { label: 'Hold', color: '#34d399' },
  { label: 'Exit', color: '#a78bfa' },
] as const;

export const DASHBOARD_PLACEHOLDER_ROUTES = [
  '/dashboard/deals',
  '/dashboard/insights',
  '/dashboard/reports',
  '/dashboard/inbox',
  '/dashboard/team',
  '/dashboard/marketplace',
  '/dashboard/settings',
] as const;
