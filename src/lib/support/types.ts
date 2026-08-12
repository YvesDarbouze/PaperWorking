export type TicketStatus = 'active' | 'pending' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high';
export type AuthorType = 'customer' | 'internal_reply' | 'internal_note';

export interface TicketMessage {
  id: string;
  authorType: AuthorType;
  authorUid: string | null;
  authorEmail: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  body: string;
  requesterUid: string | null;
  requesterEmail: string;
  requesterName: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeUid: string | null;
  assigneeName: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastCustomerReplyAt: string | null;
  lastInternalReplyAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  snoozedUntil: string | null;
  fcrEligible: boolean;
  messages?: TicketMessage[];
}

export interface TaxonomyTag {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  category: string;
  createdByUid: string;
  createdAt: string;
}

export interface PresenceLock {
  ticketId: string;
  uid: string;
  displayName: string;
  lastActiveAt: string;
}
