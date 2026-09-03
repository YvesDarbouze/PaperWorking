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
