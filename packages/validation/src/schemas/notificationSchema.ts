/**
 * ═══════════════════════════════════════════════════════════════
 * PaperWorking — Notification Schema (Zod)
 *
 * Canonical Zod schema for the Firestore `/notifications/{notificationId}`
 * collection. Notifications are server-created (Admin SDK) and
 * delivered to users via in-app, email, and/or push channels.
 *
 * Mirrors: src/types/notification.ts (Notification, NotificationType)
 *
 * @architect     Schema owner
 * @notifications Feature owner
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────

/** All notification event types */
export const notificationTypeEnum = z.enum([
  'VENDOR_BID',
  'INVEST_INVITE',
  'TASK_COMPLETE',
  'TASK_ASSIGNED',
  'PHASE_TRANSITION',
  'DEADLINE_ALERT',
  'BILLING_CHARGED',
  'DOCUMENT_SIGNED',
  'RECEIPT_APPROVAL',
  'TEAM_INVITE',
  'TEAM_INVITE_REMINDER',
  'OVER_IMPROVEMENT_ALERT',
  'BURN_RATE_WARNING',
  'VENDOR_LEAD',
]);

/** Urgency levels — drive visual treatment and delivery priority */
export const notificationUrgencyEnum = z.enum([
  'informational',
  'actionable',
  'critical',
]);

/** Delivery channels */
export const notificationChannelEnum = z.enum([
  'in-app',
  'email',
  'push',
]);

// ── Nested Schemas ─────────────────────────────────────────

/** The actor who triggered the notification */
export const notificationActorSchema = z.object({
  /** Firebase UID of the actor */
  uid: z.string().min(1),
  /** Display name */
  name: z.string(),
  /** Optional role for context */
  role: z.string().optional(),
  /** Avatar URL for display */
  avatarUrl: z.string().url().optional(),
});

/** Reference data embedded in the notification for routing and display */
export const notificationObjectReferenceSchema = z.object({
  projectId: z.string().optional(),
  dealAddress: z.string().optional(),
  /** Formatted currency string (e.g. "$15,000") */
  amount: z.string().optional(),
  /** Formatted time string (e.g. "2 hours") */
  time: z.string().optional(),
  task: z.string().optional(),
  phase: z.string().optional(),
  plan: z.string().optional(),
  card: z.string().optional(),
  vendor: z.string().optional(),
  teammate: z.string().optional(),
  documentName: z.string().optional(),
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  /** Formatted daily burn rate (e.g. "$45.00") */
  dailyBurnRate: z.string().optional(),
  /** Catch-all for notification-type-specific data */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Main Schema ────────────────────────────────────────────

/**
 * Firestore `/notifications/{notificationId}` document schema.
 *
 * Created exclusively by server-side Admin SDK.
 * Clients can only update `read`, `archived`, and `readAt` fields
 * (enforced by Firestore security rules).
 */
export const notificationSchema = z.object({
  /** Firestore document ID */
  id: z.string().min(1),

  /** Firebase UID of the recipient */
  recipientId: z.string().min(1),

  /** Event type that triggered this notification */
  type: notificationTypeEnum,

  /** Short title (e.g. "John bid $15,000 on 123 Elm St") */
  title: z.string(),

  /** Body text — longer description */
  body: z.string(),

  /** Who triggered this notification */
  actor: notificationActorSchema,

  /** Reference data for routing and display */
  objectReference: notificationObjectReferenceSchema,

  /** Urgency level — drives visual treatment */
  urgencyLevel: notificationUrgencyEnum,

  /** Which channels this notification was delivered to */
  channels: z.array(notificationChannelEnum),

  /** Whether the recipient has read this notification */
  read: z.boolean(),

  /** Whether the recipient has archived this notification */
  archived: z.boolean(),

  /** When the notification was created */
  createdAt: z.any(),

  /** Optional expiry for transient notifications */
  expiresAt: z.any().optional(),

  /** Deep link URL for routing when clicked */
  deepLinkUrl: z.string(),
});

/** Inferred TypeScript type from the Zod schema */
export type Notification = z.infer<typeof notificationSchema>;
