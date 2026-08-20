export const INBOX_TABS = [
  { id: 'all', label: 'All' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'vendor', label: 'Vendor Bids' },
  { id: 'team', label: 'Team' },
  { id: 'system', label: 'System' },
] as const;

export type InboxTabId = (typeof INBOX_TABS)[number]['id'];

export const INBOX_THREADS = [
  {
    id: 'thread-1',
    tab: 'opportunities' as InboxTabId,
    subject: 'Loan estimate ready for review',
    project: '88 Harbor Lane',
    from: 'Capital Partners Lending',
    preview: 'Updated soft terms for the bridge facility — review before Friday.',
    unread: true,
    receivedAt: '2026-08-19T14:22:00Z',
  },
  {
    id: 'thread-2',
    tab: 'vendor' as InboxTabId,
    subject: 'Vendor quote submitted — roof inspection',
    project: '1247 Elm Street',
    from: 'Summit Roofing Co.',
    preview: 'Quote #SR-441 attached. Site visit available next Tuesday.',
    unread: true,
    receivedAt: '2026-08-18T09:10:00Z',
  },
  {
    id: 'thread-3',
    tab: 'system' as InboxTabId,
    subject: 'Quarterly report exported',
    project: 'Portfolio',
    from: 'PaperWorking Reports',
    preview: 'Your Q2 PDF is ready in Reports → Exports.',
    unread: false,
    receivedAt: '2026-08-17T16:45:00Z',
  },
  {
    id: 'thread-4',
    tab: 'tasks' as InboxTabId,
    subject: 'Task due: Upload LOI package',
    project: '1247 Elm Street',
    from: 'Action Center',
    preview: 'Assigned to you · due in 2 days.',
    unread: true,
    receivedAt: '2026-08-19T08:00:00Z',
  },
  {
    id: 'thread-5',
    tab: 'team' as InboxTabId,
    subject: 'Jordan joined the workspace',
    project: 'Team',
    from: 'PaperWorking Team',
    preview: 'Jordan Lee accepted Analyst invite.',
    unread: false,
    receivedAt: '2026-08-16T11:20:00Z',
  },
  {
    id: 'thread-6',
    tab: 'opportunities' as InboxTabId,
    subject: 'New co-invest interest on 512 Oak Ridge',
    project: '512 Oak Ridge',
    from: 'Deals Marketplace',
    preview: '2 investors requested term sheet access.',
    unread: true,
    receivedAt: '2026-08-19T18:05:00Z',
  },
] as const;

export const TEAM_MEMBERS = [
  {
    id: 'member-1',
    name: 'Alex Morgan',
    email: 'alex@paperworking.test',
    role: 'Lead Investor',
    type: 'Internal' as const,
    status: 'Active' as const,
    projects: 2,
    lastActive: '2h ago',
  },
  {
    id: 'member-2',
    name: 'Jordan Lee',
    email: 'jordan@paperworking.test',
    role: 'Analyst',
    type: 'Internal' as const,
    status: 'Active' as const,
    projects: 3,
    lastActive: 'Yesterday',
  },
  {
    id: 'member-3',
    name: 'Sam Rivera',
    email: 'sam@paperworking.test',
    role: 'Vendor liaison',
    type: 'External' as const,
    status: 'Invited' as const,
    projects: 1,
    lastActive: '—',
  },
  {
    id: 'member-4',
    name: 'Casey Nguyen',
    email: 'casey@paperworking.test',
    role: 'Viewer',
    type: 'Internal' as const,
    status: 'Active' as const,
    projects: 1,
    lastActive: '3d ago',
  },
] as const;

export const TEAM_SEATS = {
  used: 4,
  limit: 5,
  tier: 'Investment Team',
} as const;

export const SETTINGS_SECTIONS = [
  {
    id: 'general',
    title: 'General',
    description: 'Workspace name, timezone, and default currency.',
    href: '/dashboard/settings',
    disabled: true,
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Name, email, and investor persona preferences.',
    href: '/dashboard/settings/profile',
    disabled: false,
  },
  {
    id: 'marketplace-profile',
    title: 'Marketplace profile',
    description: 'Public investor / vendor card for discovery.',
    href: '/dashboard/marketplace',
    disabled: false,
  },
  {
    id: 'team',
    title: 'Team',
    description: 'Seats, roles, and invitation controls.',
    href: '/dashboard/team',
    disabled: false,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Deal alerts, report delivery, and vendor quote updates.',
    href: '/dashboard/settings',
    disabled: true,
  },
  {
    id: 'billing',
    title: 'Billing',
    description: 'Plan, payment method, and invoices.',
    href: '/dashboard/settings/billing',
    disabled: false,
  },
  {
    id: 'data',
    title: 'Data & privacy',
    description: 'Exports, retention, and GDPR tools.',
    href: '/dashboard/settings',
    disabled: true,
  },
  {
    id: 'audit',
    title: 'Audit logs',
    description: 'Security events and admin actions.',
    href: '/dashboard/settings',
    disabled: true,
  },
] as const;

export const BILLING_PREVIEW = {
  plan: 'Individual',
  status: 'trialing',
  trialEnds: '2026-09-03',
  monthlyPrice: 59,
  paymentMethod: 'Mock sandbox — no card on file',
  billingEmail: 'investor@paperworking.test',
  invoices: [
    { id: 'inv_001', date: '2026-07-03', amount: 59, status: 'Paid' },
    { id: 'inv_002', date: '2026-06-03', amount: 59, status: 'Paid' },
    { id: 'inv_003', date: '2026-05-03', amount: 0, status: 'Trial' },
  ],
} as const;

export const PROFILE_PREVIEW = {
  name: 'Dev Investor',
  email: 'investor@paperworking.test',
  phone: '+1 (512) 555-0142',
  accountType: 'investor',
  organization: 'Migration Preview Org',
  role: 'Lead Investor',
  mfaEnabled: false,
  activity: [
    { id: 'a1', title: 'Signed in from Chrome · Austin, TX', time: '2h ago' },
    { id: 'a2', title: 'Updated marketplace profile', time: 'Yesterday' },
    { id: 'a3', title: 'Exported quarterly report (PDF)', time: '3d ago' },
  ],
} as const;

export const REPORT_NARRATIVE =
  'Portfolio is tracking above underwriting IRR with three active deals. Capital deployed is concentrated in Fund and Hold phases; Action Center flags two items needing attention before month-end.';
