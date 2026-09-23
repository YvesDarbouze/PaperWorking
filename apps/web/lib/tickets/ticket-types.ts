/**
 * Unified ticket domain types — shared by the ticket store, admin APIs, and UI.
 */

export type TicketKind = 'bug' | 'feature_request' | 'idea' | 'callback' | 'support' | 'question';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketQueue = 'unassigned' | 'mine' | 'all';

export interface TicketEngagementMessage {
  id: string;
  author: 'user' | 'assistant' | 'admin' | 'system';
  authorName: string;
  authorEmail?: string;
  content: string;
  timestamp: string;
  isInternalNote?: boolean;
  attachments?: Array<{
    name: string;
    url?: string;
    type?: string;
    size?: number;
  }>;
}

export interface AdminTicketRecord {
  id: string;
  kind: TicketKind;
  subject: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  requesterTier: string;
  status: TicketStatus;
  priority: TicketPriority;
  queue: TicketQueue;
  assignedTo?: string;
  module?: string;
  reilPhase?: string;
  dinnerPledge?: boolean;
  phone?: string;
  preferredWindow?: string;
  diagnostics?: Record<string, unknown>;
  hasAttachment?: boolean;
  attachmentName?: string;
  tags: string[];
  engagementHistory: TicketEngagementMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  id?: string;
  kind: TicketKind;
  subject: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  requesterTier?: string;
  priority?: TicketPriority;
  queue?: TicketQueue;
  assignedTo?: string;
  module?: string;
  reilPhase?: string;
  dinnerPledge?: boolean;
  phone?: string;
  preferredWindow?: string;
  diagnostics?: Record<string, unknown>;
  hasAttachment?: boolean;
  attachmentName?: string;
  tags?: string[];
  initialMessage?: string;
}

export interface TicketFilterOptions {
  queue?: TicketQueue | 'all';
  status?: TicketStatus | 'all';
  kind?: TicketKind | 'all';
  priority?: TicketPriority | 'all';
  search?: string;
  limit?: number;
}
