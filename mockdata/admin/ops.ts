export const SEED_SYNTHETIC_AGENTS = [
  {
    id: 'agent-scout',
    uid: 'uid-scout',
    name: 'Scout',
    email: 'scout@paperworking.test',
    persona: 'wholesaler',
    handle: '@scout',
    stats: { projectsCount: 3, listingsCount: 2, messagesCount: 14 },
  },
  {
    id: 'agent-atlas',
    uid: 'uid-atlas',
    name: 'Atlas',
    email: 'atlas@paperworking.test',
    persona: 'commercial',
    handle: '@atlas',
    stats: { projectsCount: 5, listingsCount: 1, messagesCount: 22 },
  },
  {
    id: 'agent-dana',
    uid: 'uid-dana',
    name: 'Dana',
    email: 'dana@paperworking.test',
    persona: 'flipper',
    handle: '@dana',
    stats: { projectsCount: 4, listingsCount: 3, messagesCount: 9 },
  },
];

export function listSeedSyntheticAgents() {
  return SEED_SYNTHETIC_AGENTS.map((agent) => ({ ...agent }));
}

export function getSeedSyntheticAgent(agentId: string) {
  const agent = SEED_SYNTHETIC_AGENTS.find((item) => item.id === agentId);
  if (!agent) return null;
  return {
    ...agent,
    bio: `${agent.name} synthetic agent for marketplace QA.`,
    createdAt: '2026-06-01T00:00:00.000Z',
    lastActiveAt: '2026-08-10T12:00:00.000Z',
    projects: ['deal-1', 'deal-2'],
  };
}

export function deleteSeedSyntheticAgent(agentId: string): { message: string } | null {
  const index = SEED_SYNTHETIC_AGENTS.findIndex((agent) => agent.id === agentId);
  if (index < 0) return null;
  SEED_SYNTHETIC_AGENTS.splice(index, 1);
  return { message: `Successfully deleted synthetic agent ${agentId} and all associated records.` };
}

export const SEED_RENTCAST_USAGE = { count: 87, limit: 500 };

export const SEED_LENDER_RATES_DOC = {
  rates: [
    {
      id: 'NEO',
      name: 'NEO Capital',
      interestRate: 6.125,
      points: 1,
      lenderFeesCents: 125000,
      asOf: { toDate: () => new Date('2026-07-01T00:00:00.000Z') },
    },
    {
      id: 'LEGACY',
      name: 'Legacy Bank',
      interestRate: 6.45,
      points: 1.5,
      lenderFeesCents: 150000,
      asOf: { toDate: () => new Date('2026-07-01T00:00:00.000Z') },
    },
  ],
  updatedAt: { toDate: () => new Date('2026-08-01T00:00:00.000Z') },
  updatedByEmail: 'admin@paperworking.test',
};

export const SEED_LENDER_CHECKLISTS_DOC = {
  Conventional: ['Tax Returns', 'Bank Statements', 'Purchase Contract'],
  'SBA 504': ['SBA Form 413', 'Business Plan'],
  'Hard Money': ['Scope of Work', 'Exit Strategy Memo'],
  Bridge: ['Bridge Term Sheet', 'Refinance Commitment'],
  updatedAt: '2026-08-01T00:00:00.000Z',
  updatedByEmail: 'admin@paperworking.test',
};

/** Platform ops seed — mirrors v0 admin action payloads for local preview. */
export const SEED_ADMIN_OVERVIEW = {
  mrr: 48200,
  revenueThisMonth: 51250,
  revenueLastMonth: 44100,
  activeUsers: 1284,
  churnRate: 2.4,
  trialUsers: 96,
  totalUsers: 1840,
  totalProjects: 612,
  kpis: [
    {
      label: 'MRR',
      value: '$48.2k',
      change: 8.4,
      changeLabel: 'vs last mo',
      sparkline: [38, 40, 41, 43, 45, 48],
    },
    {
      label: 'Active Users',
      value: '1,284',
      change: 5.2,
      changeLabel: 'vs last mo',
      sparkline: [1100, 1140, 1180, 1200, 1240, 1284],
    },
    {
      label: 'Churn',
      value: '2.4%',
      change: -0.3,
      changeLabel: 'vs last mo',
      sparkline: [3.1, 2.9, 2.8, 2.6, 2.5, 2.4],
    },
    {
      label: 'Trials',
      value: '96',
      change: 12.0,
      changeLabel: 'vs last mo',
      sparkline: [70, 74, 80, 85, 90, 96],
    },
    {
      label: 'Total Users',
      value: '1,840',
      change: 6.1,
      changeLabel: 'vs last mo',
    },
    {
      label: 'Total Projects',
      value: '612',
      change: 4.8,
      changeLabel: 'vs last mo',
    },
  ],
  plans: [
    { name: 'Individual', count: 920, color: '#111111' },
    { name: 'Team', count: 410, color: '#454955' },
    { name: 'Vendor', count: 310, color: '#7A9EAA' },
    { name: 'Trial', count: 200, color: '#C4C0B8' },
  ],
  activity: [
    {
      id: 'act-1',
      type: 'signup',
      message: 'New investor signup — bob@capital.test joined Individual',
      timestamp: '2h ago',
    },
    {
      id: 'act-2',
      type: 'payment',
      message: 'Invoice paid — Atlas Syndicate $499 Team',
      timestamp: '4h ago',
    },
    {
      id: 'act-3',
      type: 'ticket',
      message: 'Ticket SUP-1842 claimed by Support Lead',
      timestamp: '6h ago',
    },
    {
      id: 'act-4',
      type: 'audit',
      message: 'Admin impersonated Scout for QA',
      timestamp: '8h ago',
    },
  ],
};

export const SEED_ADMIN_USERS = [
  {
    id: 'u-1',
    displayName: 'Bob Capital',
    email: 'bob@capital.test',
    role: 'Investor',
    subscriptionPlan: 'Individual',
    subscriptionStatus: 'active',
    projectCount: 4,
    lastLoginAt: '2026-08-21T10:00:00.000Z',
    joinedAt: '2026-03-12T00:00:00.000Z',
  },
  {
    id: 'u-2',
    displayName: 'Atlas Syndicate',
    email: 'ops@atlas.test',
    role: 'Investor',
    subscriptionPlan: 'Team',
    subscriptionStatus: 'active',
    projectCount: 11,
    lastLoginAt: '2026-08-20T22:00:00.000Z',
    joinedAt: '2025-11-02T00:00:00.000Z',
  },
  {
    id: 'u-3',
    displayName: 'Ridge Line Builders',
    email: 'hello@ridgeline.test',
    role: 'Vendor',
    subscriptionPlan: 'Vendor',
    subscriptionStatus: 'past_due',
    projectCount: 0,
    lastLoginAt: '2026-08-18T08:00:00.000Z',
    joinedAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: 'u-4',
    displayName: 'Dana Flip Co',
    email: 'dana@flip.test',
    role: 'Investor',
    subscriptionPlan: 'Individual',
    subscriptionStatus: 'trialing',
    projectCount: 2,
    lastLoginAt: '2026-08-21T07:30:00.000Z',
    joinedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'u-5',
    displayName: 'Metro Stay PM',
    email: 'team@metrostay.test',
    role: 'Vendor',
    subscriptionPlan: 'Vendor',
    subscriptionStatus: 'canceled',
    projectCount: 0,
    lastLoginAt: '2026-07-02T00:00:00.000Z',
    joinedAt: '2025-09-14T00:00:00.000Z',
  },
];

export const SEED_ADMIN_USER_STATS = {
  total: SEED_ADMIN_USERS.length,
  active: SEED_ADMIN_USERS.filter((u) => u.subscriptionStatus === 'active').length,
  pastDue: SEED_ADMIN_USERS.filter((u) => u.subscriptionStatus === 'past_due').length,
  churned: SEED_ADMIN_USERS.filter((u) => u.subscriptionStatus === 'canceled').length,
  users: SEED_ADMIN_USERS,
};

export const SEED_ADMIN_SUBSCRIPTIONS = {
  mrr: 48200,
  arr: 578400,
  active: 1180,
  atRisk: 42,
  planBreakdown: [
    { name: 'Individual', count: 920, mrr: 18400 },
    { name: 'Team', count: 210, mrr: 20900 },
    { name: 'Vendor', count: 50, mrr: 8900 },
  ],
  recent: [
    {
      id: 'sub-1',
      customer: 'Bob Capital',
      plan: 'Individual',
      status: 'active',
      mrr: 49,
      renewsAt: '2026-09-12',
    },
    {
      id: 'sub-2',
      customer: 'Atlas Syndicate',
      plan: 'Team',
      status: 'active',
      mrr: 499,
      renewsAt: '2026-09-01',
    },
    {
      id: 'sub-3',
      customer: 'Ridge Line Builders',
      plan: 'Vendor',
      status: 'past_due',
      mrr: 99,
      renewsAt: '2026-08-15',
    },
  ],
  dunning: [
    {
      id: 'dun-1',
      customer: 'Ridge Line Builders',
      amount: 99,
      attempts: 2,
      nextRetryAt: '2026-08-23',
      reason: 'card_declined',
    },
    {
      id: 'dun-2',
      customer: 'Harbor Title',
      amount: 99,
      attempts: 1,
      nextRetryAt: '2026-08-24',
      reason: 'insufficient_funds',
    },
  ],
};

export const SEED_ADMIN_TICKETS = [
  {
    id: 'SUP-1842',
    subject: 'Cannot upload LOI package',
    requester: 'bob@capital.test',
    queue: 'unassigned',
    priority: 'high',
    status: 'open',
    tags: ['uploads', 'projects'],
    updatedAt: '2026-08-21T15:00:00.000Z',
  },
  {
    id: 'SUP-1838',
    subject: 'Plaid reconnect loop',
    requester: 'ops@atlas.test',
    queue: 'mine',
    priority: 'medium',
    status: 'pending',
    tags: ['plaid', 'banking'],
    updatedAt: '2026-08-21T12:20:00.000Z',
  },
  {
    id: 'SUP-1820',
    subject: 'Vendor quote not showing',
    requester: 'hello@ridgeline.test',
    queue: 'all',
    priority: 'low',
    status: 'resolved',
    tags: ['marketplace', 'vendor'],
    updatedAt: '2026-08-20T09:00:00.000Z',
  },
];

export const SEED_ADMIN_AUDIT = {
  chainIntact: true,
  critical: 2,
  warnings: 5,
  total: 128,
  logs: [
    {
      id: 'aud-1',
      seq: 128,
      severity: 'info',
      action: 'user.login',
      actor: 'bob@capital.test',
      target: 'session',
      details: 'Successful mock login',
      ip: '192.168.1.8',
      at: '2026-08-21T18:01:00.000Z',
      hash: 'a1b2c3',
    },
    {
      id: 'aud-2',
      seq: 127,
      severity: 'warning',
      action: 'billing.retry_failed',
      actor: 'system',
      target: 'sub-3',
      details: 'Card declined on retry #2',
      ip: '—',
      at: '2026-08-21T17:40:00.000Z',
      hash: 'd4e5f6',
    },
    {
      id: 'aud-3',
      seq: 126,
      severity: 'critical',
      action: 'admin.impersonate',
      actor: 'admin@paperworking.test',
      target: 'uid-scout',
      details: 'QA impersonation started',
      ip: '10.0.0.12',
      at: '2026-08-21T12:10:00.000Z',
      hash: '789abc',
    },
  ],
};

export const SEED_ADMIN_ANALYTICS = {
  userGrowth: { thisMonth: 84, lastMonth: 71, wow: '+18%' },
  revenueSnapshot: { mrr: 48200, growth: '+8.4%' },
  retention: { d30: 86, d90: 72, d180: 61 },
  platformActivity: { projectsCreated: 48, dealsPublished: 19, messages: 1240 },
  featureAdoption: [
    { name: 'Marketplace', pct: 62 },
    { name: 'Reports', pct: 48 },
    { name: 'Plaid', pct: 31 },
    { name: 'Team seats', pct: 22 },
  ],
  accountTypes: [
    { name: 'Investor', count: 1420 },
    { name: 'Vendor', count: 310 },
    { name: 'Admin', count: 12 },
  ],
  plaid: {
    connected: 412,
    needsReauth: 18,
    healthyPct: 95.6,
    connections: [
      { id: 'pl-1', user: 'Bob Capital', institution: 'Chase', status: 'healthy' },
      { id: 'pl-2', user: 'Atlas Syndicate', institution: 'Amex', status: 'reauth' },
    ],
  },
  support: { frtHours: 1.8, fcrPct: 74, csat: 4.6, volume: 126 },
};

export const SEED_ADMIN_MARKETPLACE = {
  liveVendors: 64,
  monthlyVolume: 1280000,
  openPipeline: 38,
  matchRate: 71,
  avgLatencyHours: 6.4,
  jurisdictionVariance: [
    { name: 'TX', variance: 4.2 },
    { name: 'CA', variance: 7.8 },
    { name: 'FL', variance: 5.1 },
    { name: 'CO', variance: 3.4 },
  ],
  funnel: [
    { step: 'Impressions', count: 12400 },
    { step: 'Profile views', count: 3100 },
    { step: 'Quote requests', count: 420 },
    { step: 'Accepted', count: 96 },
  ],
};

export function getAdminOpsSection(section: string) {
  switch (section) {
    case 'overview':
      return SEED_ADMIN_OVERVIEW;
    case 'users':
      return SEED_ADMIN_USER_STATS;
    case 'subscriptions':
      return SEED_ADMIN_SUBSCRIPTIONS;
    case 'tickets':
      return { tickets: SEED_ADMIN_TICKETS };
    case 'audit':
      return SEED_ADMIN_AUDIT;
    case 'analytics':
      return SEED_ADMIN_ANALYTICS;
    case 'marketplace':
      return SEED_ADMIN_MARKETPLACE;
    default:
      return null;
  }
}
