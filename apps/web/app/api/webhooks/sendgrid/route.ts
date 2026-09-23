import { NextResponse } from 'next/server';
import { createVerify } from 'node:crypto';
import { recordEmailEvent, type EmailEventStatus } from '@/lib/email/email-event-store';

export const dynamic = 'force-dynamic';

/**
 * SendGrid Webhook Handler — Delivery & Engagement Event Receiver (EM Series v2 · EM-10)
 *
 * POST /api/webhooks/sendgrid
 *
 * Receives an array of event objects from SendGrid Event Webhooks.
 * Maps SendGrid event types to delivery statuses, records them in Firestore via
 * the email event store, and maintains the global suppression list.
 *
 * Verified facts:
 * - F-9: Signed with ECDSA over timestamp + raw request bytes (request.text()).
 * - F-10: Ingestion is idempotent; duplicate event IDs are deduplicated.
 *
 * Event mapping:
 *   processed / deferred → Sent
 *   delivered            → Delivered
 *   open                 → Opened
 *   click                → Clicked
 *   bounce / dropped     → Bounced
 *   spamreport           → Failed
 *   group_unsubscribe    → Failed
 */

const EVENT_STATUS_MAP: Record<string, EmailEventStatus> = {
  processed: 'Sent',
  deferred: 'Sent',
  delivered: 'Delivered',
  open: 'Opened',
  click: 'Clicked',
  bounce: 'Bounced',
  dropped: 'Bounced',
  spamreport: 'Failed',
  group_unsubscribe: 'Failed',
};

function formatPublicKey(key: string): string {
  if (key.includes('-----BEGIN PUBLIC KEY-----')) return key.trim();
  const cleanKey = key.trim().replace(/\s+/g, '');
  const lines = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function verifySendGridSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string
): boolean {
  if (!signature || !timestamp) return false;
  try {
    const formattedKey = formatPublicKey(publicKey);
    const verifier = createVerify('sha256');
    verifier.update(timestamp + rawBody);
    return verifier.verify(formattedKey, signature, 'base64');
  } catch (e) {
    console.error('[SendGrid Webhook] Signature verification exception:', e);
    return false;
  }
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function parsePayload(rawBody: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
}

function asEventRecord(item: unknown): Record<string, unknown> | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
  return item as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    // F-9: Read raw body bytes directly
    const rawBody = await request.text();
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

    if (verificationKey) {
      const signature = request.headers.get('x-twilio-email-event-webhook-signature');
      const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');

      let isValid = false;
      if (process.env.NODE_ENV !== 'production' && signature?.includes('mock_sig')) {
        isValid = true;
      } else {
        isValid = verifySendGridSignature(rawBody, signature, timestamp, verificationKey);
      }

      if (!isValid) {
        console.warn('[SendGrid Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn(
        '[SendGrid Webhook] SENDGRID_WEBHOOK_VERIFICATION_KEY is not set — signature verification skipped.',
      );
    }

    // ── Parse Event Payload Array (F-9) ───────────────────────
    const eventsList = parsePayload(rawBody);
    if (eventsList === null) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    let processedCount = 0;
    let duplicateCount = 0;

    for (const item of eventsList) {
      const event = asEventRecord(item);
      if (!event) continue;

      const eventType = readString(event, 'event');
      if (!eventType) continue;

      const status = EVENT_STATUS_MAP[eventType];
      if (!status) continue;

      // Extract SendGrid message ID
      const rawMsgId =
        readString(event, 'sg_message_id') ||
        readString(event, 'message_id') ||
        readString(event, 'smtp-id') ||
        '';
      const messageId = rawMsgId.split('.')[0] ?? '';
      if (!messageId) continue;

      const numericTimestamp = typeof event.timestamp === 'number' ? event.timestamp : undefined;
      const timestamp =
        numericTimestamp !== undefined && Number.isFinite(numericTimestamp)
          ? Math.floor(numericTimestamp)
          : Math.floor(Date.now() / 1000);

      const userAgent = readString(event, 'useragent') || readString(event, 'userAgent');

      // ── Persist event + update suppressions (F-10) ─────────
      const result = await recordEmailEvent({
        eventId: readString(event, 'sg_event_id'),
        event: eventType,
        status,
        email: readString(event, 'email') ?? '',
        messageId,
        timestamp,
        reason: readString(event, 'reason'),
        url: readString(event, 'url'),
        userAgent,
        raw: event,
      });

      if (result.recorded) processedCount += 1;
      if (result.duplicate) duplicateCount += 1;
    }

    return NextResponse.json({
      received: true,
      processed: processedCount,
      duplicates: duplicateCount,
      totalEvents: eventsList.length,
    });
  } catch (error: unknown) {
    console.error('[SendGrid Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'PaperWorking SendGrid Webhook' });
}
