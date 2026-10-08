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
  | 'Manager'
  | 'Associate'
  | 'Vendor'
  | 'Intern'
  | 'Deal Lead'
  | 'Admin'
  | 'COO'
  | 'CFO'
  | 'President'
  | 'CEO';

export type WorkspaceAccessLevel = 'Full Edit' | 'Scoped Edit' | 'View Only';

export const WORKSPACE_ACCESS_LEVELS: {
  level: WorkspaceAccessLevel;
  label: string;
  description: string;
}[] = [
  {
    level: 'Full Edit',
    label: 'Full Edit',
    description: 'Can create, edit, approve, and manage all projects, budgets, and team allocations.',
  },
  {
    level: 'Scoped Edit',
    label: 'Scoped Edit',
    description: 'Can edit assigned deals, update task checklists, submit bids, and upload documents.',
  },
  {
    level: 'View Only',
    label: 'View Only',
    description: 'Read-only visibility across deals, milestones, and reports; cannot modify models or approve draws.',
  },
];

export function getDefaultAccessLevelForRole(role: string): WorkspaceAccessLevel {
  switch (role) {
    case 'Manager':
    case 'CEO':
    case 'President':
    case 'Admin':
      return 'Full Edit';
    case 'Associate':
    case 'Deal Lead':
    case 'COO':
    case 'CFO':
      return 'Scoped Edit';
    case 'Vendor':
      return 'Scoped Edit';
    case 'Intern':
      return 'View Only';
    default:
      return 'Scoped Edit';
  }
}

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
  accessLevel?: WorkspaceAccessLevel;
  scopedProjectId?: string | null;
  scopedProjectName?: string | null;
  scopedTabOrTask?: string | null;
}

export const ROLE_PERMISSIONS: Record<InternalRole, string> = {
  Manager:
    'Full workspace management: create and edit projects, assign tasks, oversee budgets and underwriting, and invite team members.',
  Associate:
    'Underwriting and deal execution: edit assigned deals, update task checklists, upload due diligence documents, and log expenses.',
  Vendor:
    'Restricted external access: submit estimates and bids, view assigned project tasks, and upload receipts and invoices.',
  Intern:
    'Supervised / View-only access: inspect deal models, review property documents, and prepare draft notes under operator review.',
  'Deal Lead':
    'Underwrite individual properties, assign project-level action items, and manage deal pipeline.',
  Admin: 'Manage user access levels, configure dashboard preferences, and edit settings.',
  COO: 'Access to project timelines, milestones checklist, general contractor tasks assignment, and operations.',
  CFO: 'Access to financial worksheets, underwriting inputs, cash flow targets, and closing distributions.',
  President: 'Full system access, deal pipelines configuration, and team member provisioning.',
  CEO: 'Full control over organization properties, financials, billing, and team seats allocation.',
};

export const INTERNAL_ROLES: InternalRole[] = [
  'Manager',
  'Associate',
  'Vendor',
  'Intern',
  'Deal Lead',
  'Admin',
  'COO',
  'CFO',
  'President',
  'CEO',
];

export const SCOPED_ACCESS_TABS = [
  { id: 'tab-projects', label: 'Projects Tab', icon: 'folder' },
  { id: 'tab-underwriting', label: 'Deal Underwriting', icon: 'calculate' },
  { id: 'tab-marketplace', label: 'Vendor Directory', icon: 'storefront' },
  { id: 'tab-deals', label: 'Deals Marketplace', icon: 'handshake' },
  { id: 'tab-insights', label: 'Insights & Analytics', icon: 'insights' },
  { id: 'tab-reports', label: 'Reports', icon: 'description' },
  { id: 'tab-inbox', label: 'Inbox', icon: 'inbox' },
] as const;

export const CANONICAL_LIFECYCLE_TASKS = [
  { id: 'task-acq-pof', label: 'Upload Proof of Funds & LOI Package', phase: 'Acquisition' },
  { id: 'task-acq-cap', label: 'Confirm Maximum Allowable Offer (MAO)', phase: 'Acquisition' },
  { id: 'task-fund-emd', label: 'Wire Earnest Money Deposit to Escrow', phase: 'Fund' },
  { id: 'task-fund-lender', label: 'Submit Lender Package & Disclosures', phase: 'Fund' },
  { id: 'task-fund-le', label: 'Review Loan Estimate (LE) & Lock Rate', phase: 'Fund' },
  { id: 'task-fund-ins', label: "Obtain Hazard & Builder's Risk Binder", phase: 'Fund' },
  { id: 'task-hold-stmt', label: 'Update Monthly Operating Statement', phase: 'Hold' },
  { id: 'task-exit-stmt', label: 'Upload Disposition Settlement Statement', phase: 'Exit' },
] as const;

/** Seed roster — mirrors PaperWorking Team Directory. */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-1',
    name: 'Alex Morgan',
    email: 'alex@paperworking.test',
    role: 'CEO',
    type: 'Internal',
    status: 'Active',
    accessLevel: 'Full Edit',
    projects: 3,
    lastActive: 'Active 2h ago',
    isYou: true,
  },
  {
    id: 'member-2',
    name: 'Jordan Lee',
    email: 'jordan@paperworking.test',
    role: 'Manager',
    type: 'Internal',
    status: 'Active',
    accessLevel: 'Full Edit',
    projects: 3,
    lastActive: 'Active yesterday',
  },
  {
    id: 'member-3',
    name: 'Sam Rivera',
    email: 'sam@paperworking.test',
    role: 'Associate',
    type: 'Internal',
    status: 'Active',
    accessLevel: 'Scoped Edit',
    projects: 2,
    lastActive: 'Active 3h ago',
  },
  {
    id: 'member-4',
    name: 'Apex Mechanical & Roofing',
    email: 'bids@apexmechanical.test',
    role: 'Vendor',
    type: 'External',
    status: 'Active',
    accessLevel: 'Scoped Edit',
    projects: 1,
    scopedProjectId: 'deal-2',
    scopedProjectName: '88 Harbor Lane',
    scopedTabOrTask: 'Update monthly operating statement',
    lastActive: 'Active 1d ago',
  },
  {
    id: 'member-5',
    name: 'Taylor Brooks',
    email: 'taylor@paperworking.test',
    role: 'Intern',
    type: 'Internal',
    status: 'Active',
    accessLevel: 'View Only',
    projects: 1,
    scopedProjectId: 'deal-1',
    scopedProjectName: '1247 Elm Street',
    scopedTabOrTask: 'Underwriting Review',
    lastActive: 'Active 4h ago',
  },
  {
    id: 'member-6',
    name: 'Casey Nguyen',
    email: 'casey@paperworking.test',
    role: 'CFO',
    type: 'Internal',
    status: 'Active',
    accessLevel: 'Full Edit',
    projects: 2,
    lastActive: 'Active 3d ago',
  },
  {
    id: 'member-7',
    name: 'Riley Park',
    email: 'riley@paperworking.test',
    role: 'COO',
    type: 'Internal',
    status: 'Invited',
    accessLevel: 'Scoped Edit',
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

export function addInboxThread(thread: InboxThread): InboxThread {
  const existingIdx = INBOX_THREADS.findIndex((t) => t.id === thread.id);
  let updated: InboxThread = thread;
  if (existingIdx >= 0) {
    INBOX_THREADS[existingIdx] = { ...INBOX_THREADS[existingIdx], ...thread };
    updated = INBOX_THREADS[existingIdx];
  } else {
    INBOX_THREADS.unshift(thread);
  }

  const cache = (globalThis as any).__pw_inbox_cache;
  if (cache) {
    const existing = cache.get(thread.id);
    cache.set(thread.id, {
      ...existing,
      ...updated,
    });
  }

  return updated;
}

export function getInboxThreads(): InboxThread[] {
  const cache = (globalThis as any).__pw_inbox_cache;
  if (cache && cache.size > 0) {
    return Array.from(cache.values())
      .filter((t: any) => !t.archived)
      .sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()) as InboxThread[];
  }
  return INBOX_THREADS;
}

export function getTeamMembers(): TeamMember[] {
  const cache = (globalThis as any).__pw_team_cache;
  if (cache && cache.size > 0) {
    return Array.from(cache.values()) as TeamMember[];
  }
  return TEAM_MEMBERS;
}

export function addTeamMember(member: TeamMember): void {
  TEAM_MEMBERS.push(member);
  const cache = (globalThis as any).__pw_team_cache;
  if (cache) {
    cache.set(member.id, { ...member });
  }
}

