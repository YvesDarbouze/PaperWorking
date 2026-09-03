/**
 * Inbox seed SoT for /api/inbox until Firestore inboxItems is live.
 * Mirrors dashboard INBOX_THREADS shape for UI compatibility.
 */

export type InboxApiItem = {
  id: string;
  tab: string;
  type: string;
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
  recipientUid: string;
};

let items: InboxApiItem[] = [
  {
    id: 'thread-1',
    tab: 'opportunities',
    type: 'INVEST_INVITE',
    subject: 'Loan estimate ready for review',
    project: '88 Harbor Lane',
    from: 'Capital Partners Lending',
    fromRole: 'Lender',
    preview: 'Updated soft terms for the bridge facility — review before Friday.',
    body: 'Updated soft terms for the bridge facility on 88 Harbor Lane are ready for review.',
    unread: true,
    receivedAt: '2026-08-19T14:22:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
    recipientUid: 'dev-user-1',
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
    body: 'Quote #SR-441 for roof inspection on 1247 Elm Street.',
    unread: true,
    receivedAt: '2026-08-18T09:10:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
    recipientUid: 'dev-user-1',
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
    body: 'Your Q2 portfolio PDF package finished exporting.',
    unread: false,
    receivedAt: '2026-08-17T16:45:00Z',
    deepLinkUrl: '/dashboard/reports',
    recipientUid: 'dev-user-1',
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
    body: 'Upload LOI package for 1247 Elm Street is due in 2 days.',
    unread: true,
    receivedAt: '2026-08-19T08:00:00Z',
    deepLinkUrl: '/dashboard/projects',
    actionable: true,
    recipientUid: 'dev-user-1',
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
    body: 'Jordan Lee accepted the Analyst invite.',
    unread: false,
    receivedAt: '2026-08-16T11:20:00Z',
    deepLinkUrl: '/dashboard/team',
    recipientUid: 'dev-user-1',
  },
];

export function listInboxItems(uid: string, tab?: string | null) {
  return items.filter((item) => {
    if (item.recipientUid !== uid) return false;
    if (tab && tab !== 'all' && item.tab !== tab) return false;
    return true;
  });
}

export function getInboxItem(id: string) {
  return items.find((item) => item.id === id) ?? null;
}

function categoryToTab(category: unknown): string {
  const value = String(category ?? 'system').toLowerCase();
  if (value.includes('opportunit') || value.includes('invest')) return 'opportunities';
  if (value.includes('task') || value.includes('deadline')) return 'tasks';
  if (value.includes('vendor') || value.includes('bid')) return 'vendor';
  if (value.includes('team')) return 'team';
  return 'system';
}

export function createInboxItem(doc: Record<string, unknown>) {
  const body = String(doc.body ?? doc.preview ?? '');
  const item: InboxApiItem = {
    id: String(doc.id ?? `thread-${Date.now()}`),
    tab: String(doc.tab ?? categoryToTab(doc.category)),
    type: String(doc.type ?? 'SYSTEM'),
    subject: String(doc.subject ?? doc.title ?? 'Inbox item'),
    project: String(doc.project ?? doc.projectName ?? 'Workspace'),
    from: String(doc.from ?? doc.senderName ?? doc.actorName ?? 'System'),
    fromRole: typeof doc.fromRole === 'string' ? doc.fromRole : undefined,
    preview: String(doc.preview ?? body).slice(0, 160),
    body,
    unread: typeof doc.read === 'boolean' ? !doc.read : doc.unread !== false,
    receivedAt: String(doc.receivedAt ?? doc.createdAt ?? new Date().toISOString()),
    deepLinkUrl:
      typeof doc.deepLinkUrl === 'string'
        ? doc.deepLinkUrl
        : typeof doc.actionUrl === 'string'
          ? doc.actionUrl
          : undefined,
    actionable: Boolean(doc.actionable),
    recipientUid: String(doc.recipientUid ?? 'dev-user-1'),
  };
  items = [item, ...items];
  return item;
}

export function updateInboxItem(id: string, patch: Record<string, unknown>) {
  items = items.map((item) => {
    if (item.id !== id) return item;
    let unread = item.unread;
    if (typeof patch.read === 'boolean') unread = !patch.read;
    else if (typeof patch.unread === 'boolean') unread = patch.unread;
    return {
      ...item,
      unread,
      subject: typeof patch.subject === 'string' ? patch.subject : item.subject,
      body: typeof patch.body === 'string' ? patch.body : item.body,
    };
  });
}

export function deleteInboxItem(id: string) {
  items = items.filter((item) => item.id !== id);
}
