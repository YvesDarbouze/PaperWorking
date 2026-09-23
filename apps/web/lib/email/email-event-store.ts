/**
 * Email event & suppression store.
 *
 * Persists SendGrid Event Webhook deliveries to Firestore:
 *   - `emailEvents/{eventId}`            — idempotent event log (skip when the doc already exists)
 *   - `emailSuppressions/{emailLower}`   — global suppression list (bounces, drops, spam, unsubscribes)
 *
 * Both collections are written through the Firebase Admin SDK. When Firestore is
 * unavailable (CI, tests, unconfigured local dev) every operation degrades to a
 * no-op — recording returns `{ recorded: false, duplicate: false }` and
 * `isEmailSuppressed` returns `false` — so callers never crash.
 */

import { createHash } from 'node:crypto';
import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';

/** Delivery statuses mirrored from the legacy CommunicationEngine mapping. */
export type EmailEventStatus =
  | 'Sent'
  | 'Delivered'
  | 'Opened'
  | 'Clicked'
  | 'Bounced'
  | 'Failed';

/** SendGrid event types that permanently suppress the recipient address. */
export const EMAIL_SUPPRESSION_EVENTS: readonly string[] = [
  'bounce',
  'dropped',
  'spamreport',
  'group_unsubscribe',
];

/** Parsed SendGrid event handed to the store by the webhook route. */
export interface EmailEventInput {
  /** SendGrid `sg_event_id` when present; otherwise a deterministic fallback is derived. */
  eventId?: string;
  event: string;
  status: EmailEventStatus;
  email: string;
  messageId: string;
  /** Unix timestamp in seconds (as delivered by SendGrid). */
  timestamp: number;
  reason?: string;
  url?: string;
  userAgent?: string;
  raw: Record<string, unknown>;
}

export interface EmailEventWriteResult {
  /** True when the event document was newly written. */
  recorded: boolean;
  /** True when the event document already existed and was skipped. */
  duplicate: boolean;
}

export interface EmailEventRecord {
  eventId: string;
  email: string;
  event: string;
  status: EmailEventStatus;
  messageId: string;
  timestamp: string;
  raw: Record<string, unknown>;
  reason?: string;
  url?: string;
  userAgent?: string;
}

export interface EmailSuppressionRecord {
  email: string;
  reason: string;
  suppressedAt: string;
}

export interface EventIdInput {
  eventId?: string;
  messageId: string;
  event: string;
  timestamp: number;
}

function sanitizeEventId(value: string): string {
  return value.trim().replace(/\//g, '_');
}

/**
 * Resolves the Firestore document id for an event.
 * Prefers SendGrid's `sg_event_id`; otherwise derives a deterministic
 * sha256 digest from `messageId + event + timestamp` so retries dedupe.
 */
export function resolveEventId(input: EventIdInput): string {
  const provided = typeof input.eventId === 'string' ? input.eventId.trim() : '';
  if (provided) return sanitizeEventId(provided);
  const digest = createHash('sha256')
    .update(`${input.messageId}|${input.event}|${input.timestamp}`)
    .digest('hex');
  return `fallback-${digest}`;
}

export function isSuppressionEvent(event: string): boolean {
  return EMAIL_SUPPRESSION_EVENTS.includes(event);
}

function toIsoTimestamp(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return new Date().toISOString();
  }
  return new Date(unixSeconds * 1000).toISOString();
}

function buildEventRecord(eventId: string, input: EmailEventInput): EmailEventRecord {
  const record: EmailEventRecord = {
    eventId,
    email: input.email,
    event: input.event,
    status: input.status,
    messageId: input.messageId,
    timestamp: toIsoTimestamp(input.timestamp),
    raw: input.raw,
  };
  if (input.reason) record.reason = input.reason;
  if (input.url) record.url = input.url;
  if (input.userAgent) record.userAgent = input.userAgent;
  return record;
}

/**
 * Idempotently records a SendGrid event and, for suppression events, upserts the
 * recipient onto the global suppression list.
 */
export async function recordEmailEvent(input: EmailEventInput): Promise<EmailEventWriteResult> {
  const eventId = resolveEventId(input);

  if (!shouldAttemptFirestore()) {
    return { recorded: false, duplicate: false };
  }

  const db = getAdminFirestore();
  let recorded = false;
  let duplicate = false;

  try {
    const eventRef = db.collection('emailEvents').doc(eventId);
    const existing = await eventRef.get();
    if (existing.exists) {
      duplicate = true;
    } else {
      await eventRef.set(buildEventRecord(eventId, input));
      recorded = true;
    }
  } catch (error) {
    console.error(`[EmailEventStore] Failed to persist event ${eventId}:`, error);
  }

  const emailLower = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (isSuppressionEvent(input.event) && emailLower) {
    try {
      const suppression: EmailSuppressionRecord = {
        email: emailLower,
        reason: input.event,
        suppressedAt: new Date().toISOString(),
      };
      await db.collection('emailSuppressions').doc(emailLower).set(suppression, { merge: true });
    } catch (error) {
      console.error(`[EmailEventStore] Failed to suppress ${emailLower}:`, error);
    }
  }

  return { recorded, duplicate };
}

/** True when the address is on the global suppression list. */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const emailLower = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!emailLower || !shouldAttemptFirestore()) return false;

  try {
    const snap = await getAdminFirestore().collection('emailSuppressions').doc(emailLower).get();
    return snap.exists;
  } catch (error) {
    console.error(`[EmailEventStore] Failed to read suppression for ${emailLower}:`, error);
    return false;
  }
}
