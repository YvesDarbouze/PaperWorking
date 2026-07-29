import { VisibilityMode } from './listing';

export interface DealInvitation {
  id: string;
  projectId: string;
  listingId: string;
  inviterUid: string;
  inviteeEmail: string;
  inviteeName?: string;
  personalNote?: string;
  visibilityMode: VisibilityMode;
  version: number;
  status: 'sent' | 'opened' | 'declined' | 'interested';
  createdAt: string;
  openedAt?: string;
  respondedAt?: string;
  token?: string;
  indication?: {
    type: 'percentage' | 'amount';
    value: number;
    currency: string | null;
    updatedAt: string;
  } | null;
}

export interface DealLedgerEntry {
  id: string;
  projectId: string;
  listingId: string;
  eventType: 'INVITATION_SENT' | 'INVITATION_OPENED' | 'INVITATION_RESPONSE' | 'TAKEDOWN_REVIEW_STARTED' | 'TAKEDOWN_RESOLVED_RESTORED' | 'TAKEDOWN_RESOLVED_WITHDRAWN';
  performedBy: string; // User UID
  inviteeEmail: string;
  version: number;
  visibilityMode: VisibilityMode;
  timestamp: string; // ISO String
  metadata?: any;
}
