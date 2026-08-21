export const INBOX_TABS = [
  { id: 'all', label: 'All', icon: 'inbox' },
  { id: 'opportunities', label: 'Opportunities', icon: 'trending_up' },
  { id: 'tasks', label: 'Tasks', icon: 'check_box' },
  { id: 'vendor', label: 'Vendor Bids', icon: 'work' },
  { id: 'team', label: 'Team', icon: 'group' },
  { id: 'system', label: 'System', icon: 'warning' },
] as const;

export type InboxTabId = (typeof INBOX_TABS)[number]['id'];

export type InboxItemType =
  | 'PHASE_TRANSITION'
  | 'DEADLINE_ALERT'
  | 'VENDOR_BID'
  | 'RECEIPT_APPROVAL'
  | 'TEAM_INVITE'
  | 'TASK_COMPLETE'
  | 'SYSTEM'
  | 'INVEST_INVITE'
  | 'DOCUMENT_SIGNED';

export interface InboxThread {
  id: string;
  tab: InboxTabId;
  type: InboxItemType;
  subject: string;
  project: string;
  from: string;
  fromRole?: string;
  preview: string;
  body: string;
  unread: boolean;
  receivedAt: string;
  deepLinkUrl?: string;
  actionable?: boolean;
}

/** Seed feed — mirrors PaperWorking unified notification center. */
export const INBOX_THREADS: InboxThread[] = [
  {
    id: 'thread-1',
    tab: 'opportunities',
    type: 'INVEST_INVITE',
    subject: 'Loan estimate ready for review',
    project: '88 Harbor Lane',
    from: 'Capital Partners Lending',
    fromRole: 'Lender',
    preview: 'Updated soft terms for the bridge facility — review before Friday.',
    body: 'Updated soft terms for the bridge facility on 88 Harbor Lane are ready for review.\n\nSoft quote: 9.25% interest-only · 18-month term · 70% LTC.\nPlease confirm by Friday so we can lock the rate sheet.',
    unread: true,
    receivedAt: '2026-08-19T14:22:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
  },
  {
    id: 'thread-2',
    tab: 'vendor',
    type: 'VENDOR_BID',
    subject: 'Vendor quote submitted — roof inspection',
    project: '1247 Elm Street',
    from: 'Summit Roofing Co.',
    fromRole: 'Vendor',
    preview: 'Quote #SR-441 attached. Site visit available next Tuesday.',
    body: 'Quote #SR-441 for roof inspection on 1247 Elm Street.\n\nProposed service date: next Tuesday.\nPayment terms: Net 15 upon completion.\nScope: full roof walk + moisture scan + written report.',
    unread: true,
    receivedAt: '2026-08-18T09:10:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
  },
  {
    id: 'thread-3',
    tab: 'system',
    type: 'SYSTEM',
    subject: 'Quarterly report exported',
    project: 'Portfolio',
    from: 'PaperWorking Reports',
    fromRole: 'System',
    preview: 'Your Q2 PDF is ready in Reports → Exports.',
    body: 'Your Q2 portfolio PDF package finished exporting.\n\nOpen Reports to download the Tax Intelligence package or re-run for another period.',
    unread: false,
    receivedAt: '2026-08-17T16:45:00Z',
    deepLinkUrl: '/dashboard/reports',
  },
  {
    id: 'thread-4',
    tab: 'tasks',
    type: 'DEADLINE_ALERT',
    subject: 'Task due: Upload LOI package',
    project: '1247 Elm Street',
    from: 'Action Center',
    fromRole: 'Ops',
    preview: 'Assigned to you · due in 2 days.',
    body: 'Upload LOI package for 1247 Elm Street is due in 2 days.\n\nRequired: signed LOI PDF, proof of funds letter, and entity W-9.',
    unread: true,
    receivedAt: '2026-08-19T08:00:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
  },
  {
    id: 'thread-5',
    tab: 'team',
    type: 'TEAM_INVITE',
    subject: 'Jordan joined the workspace',
    project: 'Team',
    from: 'PaperWorking Team',
    fromRole: 'Workspace',
    preview: 'Jordan Lee accepted Analyst invite.',
    body: 'Jordan Lee accepted the Analyst invite and now has access to shared projects in this workspace.',
    unread: false,
    receivedAt: '2026-08-16T11:20:00Z',
    deepLinkUrl: '/dashboard/team',
  },
  {
    id: 'thread-6',
    tab: 'opportunities',
    type: 'PHASE_TRANSITION',
    subject: 'New co-invest interest on 512 Oak Ridge',
    project: '512 Oak Ridge',
    from: 'Deals Marketplace',
    fromRole: 'Marketplace',
    preview: '2 investors requested term sheet access.',
    body: 'Two marketplace investors requested term sheet access for 512 Oak Ridge.\n\nReview their profiles in Marketplace before granting document vault access.',
    unread: true,
    receivedAt: '2026-08-19T18:05:00Z',
    deepLinkUrl: '/dashboard/marketplace',
    actionable: true,
  },
  {
    id: 'thread-7',
    tab: 'tasks',
    type: 'RECEIPT_APPROVAL',
    subject: 'Receipt approval needed — HVAC invoice',
    project: '88 Harbor Lane',
    from: 'Ops Ledger',
    fromRole: 'Finance',
    preview: '$2,480 invoice from CoolAir Pros awaiting approval.',
    body: 'HVAC invoice from CoolAir Pros ($2,480) needs approval before posting to the Hold ledger on 88 Harbor Lane.',
    unread: true,
    receivedAt: '2026-08-19T11:30:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
  },
  {
    id: 'thread-8',
    tab: 'system',
    type: 'DOCUMENT_SIGNED',
    subject: 'Closing disclosure signed',
    project: '512 Oak Ridge',
    from: 'DocuSign Bridge',
    fromRole: 'Documents',
    preview: 'Buyer countersigned CD · vault indexed.',
    body: 'Closing disclosure for 512 Oak Ridge was countersigned and indexed into the project vault.',
    unread: false,
    receivedAt: '2026-08-15T15:10:00Z',
    deepLinkUrl: '/dashboard/projects',
  },
];

export type TeamMemberStatus = 'Active' | 'Invited' | 'Suspended' | 'Removed';
export type TeamMemberType = 'Internal' | 'External';
export type InternalRole =
  | 'CEO'
  | 'President'
  | 'CFO'
  | 'COO'
  | 'Admin'
  | 'Deal Lead';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  type: TeamMemberType;
  status: TeamMemberStatus;
  projects: number;
  lastActive: string;
  invitedAt?: string;
  isYou?: boolean;
}

export const ROLE_PERMISSIONS: Record<InternalRole, string> = {
  CEO: 'Full control over organization properties, financials, billing, and team seats allocation.',
  President: 'Full system access, deal pipelines configuration, and team member provisioning.',
  CFO: 'Access to financial worksheets, underwriting inputs, cash flow targets, and closing distributions.',
  COO: 'Access to project timelines, milestones checklist, general contractor tasks assignment, and operations.',
  Admin: 'Manage user access levels, configure dashboard preferences, and edit settings.',
  'Deal Lead':
    'Underwrite individual properties, assign project-level action items, and manage deal pipeline.',
};

export const INTERNAL_ROLES: InternalRole[] = [
  'CEO',
  'President',
  'CFO',
  'COO',
  'Admin',
  'Deal Lead',
];

/** Seed roster — mirrors PaperWorking Team Directory. */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Alex Morgan',
    email: 'alex@paperworking.test',
    role: 'CEO',
    type: 'Internal',
    status: 'Active',
    projects: 3,
    lastActive: 'Active 2h ago',
    isYou: true,
  },
  {
    id: 'member-2',
    name: 'Jordan Lee',
    email: 'jordan@paperworking.test',
    role: 'Deal Lead',
    type: 'Internal',
    status: 'Active',
    projects: 3,
    lastActive: 'Active yesterday',
  },
  {
    id: 'member-3',
    name: 'Sam Rivera',
    email: 'sam@paperworking.test',
    role: 'Vendor liaison',
    type: 'External',
    status: 'Invited',
    projects: 1,
    lastActive: '—',
    invitedAt: '2026-08-20T14:00:00Z',
  },
  {
    id: 'member-4',
    name: 'Casey Nguyen',
    email: 'casey@paperworking.test',
    role: 'CFO',
    type: 'Internal',
    status: 'Active',
    projects: 2,
    lastActive: 'Active 3d ago',
  },
  {
    id: 'member-5',
    name: 'Riley Park',
    email: 'riley@paperworking.test',
    role: 'COO',
    type: 'Internal',
    status: 'Invited',
    projects: 0,
    lastActive: '—',
    invitedAt: '2026-08-21T09:30:00Z',
  },
];

export const TEAM_SEATS = {
  used: 3,
  limit: 10,
  tier: 'Team' as 'Individual' | 'Team',
  tierLabel: 'Investment Team',
};

export const SETTINGS_SECTIONS = [
  {
    id: 'general',
    title: 'General',
    description: 'Timezone, language, and regional workspace preferences.',
    href: '/dashboard/settings',
    disabled: false,
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
    href: '/dashboard/settings/profile',
    disabled: false,
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
  firstName: 'Dev',
  lastName: 'Investor',
  name: 'Dev Investor',
  email: 'investor@paperworking.test',
  phone: '+1 (512) 555-0142',
  accountType: 'investor',
  organization: 'Migration Preview Org',
  role: 'Lead Investor',
  mfaEnabled: false,
  invitationSuspended: false,
  claimedEmails: ['dev.investor@legacy.paperworking.test'] as string[],
  activity: [
    { id: 'a1', title: 'Signed in from Chrome · Austin, TX', time: '2h ago' },
    { id: 'a2', title: 'Updated marketplace profile', time: 'Yesterday' },
    { id: 'a3', title: 'Exported quarterly report (PDF)', time: '3d ago' },
    { id: 'a4', title: 'Invited Jordan Lee to workspace', time: '5d ago' },
  ],
  sessions: [
    {
      id: 'sess-1',
      label: 'This Device',
      detail: 'Chrome · macOS · Austin, TX',
      current: true,
    },
    {
      id: 'sess-2',
      label: 'iPhone 15',
      detail: 'Safari · iOS · Last active yesterday',
      current: false,
    },
  ],
} as const;

export const REPORT_NARRATIVE =
  'Portfolio is tracking above underwriting IRR with three active deals. Capital deployed is concentrated in Fund and Hold phases; Action Center flags two items needing attention before month-end.';
