// ═══════════════════════════════════════════════════════
//  PaperWorking Inbox — Type Definitions
//  
//  Central type system for the unified notification center.
//  Covers inbox items, feed state, and notification categories.
// ═══════════════════════════════════════════════════════

// ── Inbox Item Classification ──────────────────────────

/** High-level notification type — drives tab filtering */
export type InboxItemType = 'message' | 'invitation' | 'system' | 'action';

/** Granular category — drives icon, color, and routing behavior */
export type InboxCategory =
  | 'email_thread'        // Inbound/outbound email in a project thread
  | 'internal_comment'    // Internal team comment on a project
  | 'team_invite'         // Invitation to join an organization team
  | 'crowdfund_invite'    // Invitation to co-invest in a deal
  | 'phase_transition'    // Project advanced to a new phase
  | 'receipt_approval'    // Receipt uploaded, needs Lead Investor approval
  | 'deadline_alert'      // Contingency or closing deadline approaching
  | 'document_signed'     // Document e-signed by a party
  | 'task_assigned'       // Action item assigned to user
  | 'member_joined'       // New team member accepted an invitation
  | 'vendor_request'      // Vendor quote or completion update
  | 'general';            // Catch-all for system-generated notices

/** Action a user has taken on an actionable item */
export type InboxActionTaken = 'accepted' | 'declined' | 'dismissed';

// ── Core Data Model ────────────────────────────────────

/**
 * InboxItem — A single notification/message in a user's inbox.
 * 
 * Stored at Firestore path: `inboxItems/{id}`
 * Indexed by `recipientUid` for per-user feed isolation.
 */
export interface InboxItem {
  id: string;
  recipientUid: string;          // Who receives this item (Firestore index)
  organizationId: string;        // Multi-tenant isolation

  // Classification
  type: InboxItemType;
  category: InboxCategory;

  // Content
  title: string;                 // e.g., "John invited you to join Elm Street Project"
  body: string;                  // Rich preview text (plain text, max ~300 chars)
  senderUid?: string;            // UID of the user who triggered this notification
  senderName: string;            // Display name for avatar + attribution
  senderAvatarInitial?: string;  // Pre-computed first letter (saves runtime computation)

  // Deep-linking
  projectId?: string;            // Associated project (if any)
  projectName?: string;          // Denormalized for display without extra reads
  invitationId?: string;         // Links to `invitations/{id}` for actionable invites
  threadId?: string;             // Links to existing email thread (for message types)
  actionUrl?: string;            // Deep-link destination when clicked

  // State
  read: boolean;
  archived: boolean;
  actionTaken?: InboxActionTaken;

  // Timestamps
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;              // Auto-cleanup for transient notifications
}

// ── Firestore Document Shape ───────────────────────────
// Firestore stores Timestamps, not Date objects.
// This type represents the raw document before client-side hydration.

export interface InboxItemFirestore extends Omit<InboxItem, 'createdAt' | 'readAt' | 'expiresAt'> {
  createdAt: import('firebase/firestore').Timestamp;
  readAt?: import('firebase/firestore').Timestamp;
  expiresAt?: import('firebase/firestore').Timestamp;
}

// ── Hook Return Types ──────────────────────────────────

export interface InboxTabCounts {
  all: number;
  message: number;
  invitation: number;
  system: number;
  action: number;
}

export interface UseInboxFeedReturn {
  items: InboxItem[];
  loading: boolean;
  error: string | null;
  unreadCounts: InboxTabCounts;
  unreadTotal: number;
  activeTab: InboxItemType | 'all';
  setActiveTab: (tab: InboxItemType | 'all') => void;
  markAsRead: (itemId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archiveItem: (itemId: string) => Promise<void>;
  respondToInvitation: (itemId: string, action: 'accepted' | 'declined') => Promise<void>;
}

// ── Tab Configuration ──────────────────────────────────

export interface InboxTabConfig {
  id: InboxItemType | 'all';
  label: string;
  icon: string;  // Lucide icon name
}

export const INBOX_TABS: InboxTabConfig[] = [
  { id: 'all',        label: 'All',         icon: 'Inbox' },
  { id: 'message',    label: 'Messages',    icon: 'MessageSquare' },
  { id: 'invitation', label: 'Invitations', icon: 'UserPlus' },
  { id: 'system',     label: 'System',      icon: 'Bell' },
  { id: 'action',     label: 'Action Items', icon: 'CheckCircle' },
];

// ── Category Display Metadata ──────────────────────────

export interface CategoryMeta {
  label: string;
  icon: string;       // Lucide icon name
  color: string;      // CSS color for the icon badge
  bgColor: string;    // Background tint for the icon badge
}

export const CATEGORY_META: Record<InboxCategory, CategoryMeta> = {
  email_thread:       { label: 'Email',           icon: 'Mail',          color: '#595959', bgColor: '#F2F2F2' },
  internal_comment:   { label: 'Comment',         icon: 'MessageCircle', color: '#595959', bgColor: '#F2F2F2' },
  team_invite:        { label: 'Team Invite',     icon: 'Users',         color: '#454955', bgColor: '#e8f0fe' },
  crowdfund_invite:   { label: 'Investment',      icon: 'TrendingUp',    color: '#0d0d0d', bgColor: '#F2F2F2' },
  phase_transition:   { label: 'Phase Change',    icon: 'ArrowRight',    color: '#7F7F7F', bgColor: '#F2F2F2' },
  receipt_approval:   { label: 'Receipt',         icon: 'Receipt',       color: '#595959', bgColor: '#F2F2F2' },
  deadline_alert:     { label: 'Deadline',        icon: 'Clock',         color: '#dc2626', bgColor: '#fef2f2' },
  document_signed:    { label: 'Signed',          icon: 'FileCheck',     color: '#16a34a', bgColor: '#f0fdf4' },
  task_assigned:      { label: 'Task',            icon: 'CheckSquare',   color: '#454955', bgColor: '#e8f0fe' },
  member_joined:      { label: 'Member Joined',   icon: 'UserCheck',     color: '#16a34a', bgColor: '#f0fdf4' },
  vendor_request:     { label: 'Vendor',          icon: 'Briefcase',     color: '#595959', bgColor: '#F2F2F2' },
  general:            { label: 'Notice',          icon: 'Info',          color: '#7F7F7F', bgColor: '#F2F2F2' },
};

// ── API Request/Response Types ─────────────────────────

export interface CreateInboxItemRequest {
  recipientUid: string;
  organizationId: string;
  type: InboxItemType;
  category: InboxCategory;
  title: string;
  body: string;
  senderUid?: string;
  senderName: string;
  projectId?: string;
  projectName?: string;
  invitationId?: string;
  threadId?: string;
  actionUrl?: string;
  expiresAt?: string;    // ISO 8601 string
}

export interface UpdateInboxItemRequest {
  read?: boolean;
  archived?: boolean;
  actionTaken?: InboxActionTaken;
}
