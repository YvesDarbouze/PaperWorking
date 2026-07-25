/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Inbox Item Schema (Zod)
 *
 * Canonical Zod schema for the Firestore `/inboxItems/{itemId}`
 * collection. Inbox items are the universal feed for vendor leads,
 * team communications, and system alerts delivered in real-time
 * via Firestore onSnapshot.
 *
 * Mirrors: src/types/inbox.ts (InboxItem)
 *
 * @architect     Schema owner
 * @notifications Feature owner
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────

/** Inbox item type — determines rendering template and CTA */
export const inboxItemTypeEnum = z.enum([
  'vendor_lead',
  'team_invite',
  'system_alert',
  'message',
  'task_notification',
  'billing_alert',
  'document_shared',
  'unattributed_transaction',
  'missed_rent',
]);

/** Priority levels — drive sort order and visual treatment */
export const inboxPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
]);

// ── Main Schema ────────────────────────────────────────────

/**
 * Firestore `/inboxItems/{itemId}` document schema.
 *
 * Real-time delivered via onSnapshot subscriptions on the client.
 * Users can mark read, archive, or delete items.
 */
export const inboxItemSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Firebase UID of the recipient */
  recipientUid: z.string().min(1),

  /** Organization context for multi-tenant inbox filtering */
  organizationId: z.string().min(1),

  /** Item type — determines rendering template */
  type: inboxItemTypeEnum,

  /** Short display title */
  title: z.string().min(1),

  /** Body text / preview */
  body: z.string(),

  /** Priority level */
  priority: inboxPriorityEnum,

  /** Whether the item has been read */
  read: z.boolean(),

  /** Whether the item has been archived by the user */
  archived: z.boolean(),

  /** Firebase UID of the sender (if applicable) */
  senderUid: z.string().optional(),

  /** Denormalized sender display name */
  senderName: z.string().optional(),

  /** Denormalized sender avatar URL */
  senderAvatarUrl: z.string().url().optional(),

  /** Associated project ID (for project-scoped items) */
  projectId: z.string().optional(),

  /** Denormalized property name for display */
  propertyName: z.string().optional(),

  /** Deep link path for routing when clicked */
  actionUrl: z.string().optional(),

  /** CTA button label (e.g. "View Lead", "Accept Invite") */
  actionLabel: z.string().optional(),

  /** Additional metadata specific to the item type */
  metadata: z.record(z.string(), z.unknown()).optional(),

  /** When the item was created */
  createdAt: z.any(),

  /** When the item was last updated */
  updatedAt: z.any().optional(),

  /** When the item expires (auto-cleanup) */
  expiresAt: z.any().optional(),
});

/** Inferred TypeScript type from the Zod schema */
export type InboxItem = z.infer<typeof inboxItemSchema>;
