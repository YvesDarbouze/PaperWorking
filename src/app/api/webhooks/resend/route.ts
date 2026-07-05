import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { CommunicationEngine, EmailStatus } from '@/lib/engine/CommunicationEngine';

/**
 * Resend Webhook Handler — Delivery Event Receiver
 *
 * POST /api/webhooks/resend
 *
 * Receives webhook events from Resend for email delivery tracking.
 * Maps Resend event types to EmailLog status updates.
 *
 * Resend event types:
 *   email.sent        → Sent
 *   email.delivered    → Delivered
 *   email.opened       → Opened
 *   email.clicked      → Clicked
 *   email.bounced      → Bounced
 *   email.complained   → Failed
 *
 * Security: Validates the webhook signing secret (RESEND_WEBHOOK_SECRET)
 * if configured. Otherwise accepts all events (development mode).
 *
 * @see https://resend.com/docs/webhooks
 */

// Maps Resend event types to our internal EmailStatus
const EVENT_STATUS_MAP: Record<string, EmailStatus> = {
  'email.sent': 'Sent',
  'email.delivered': 'Delivered',
  'email.opened': 'Opened',
  'email.clicked': 'Clicked',
  'email.bounced': 'Bounced',
  'email.complained': 'Failed',
  'email.delivery_delayed': 'Sent', // Keep as Sent — transient delay
};

export async function POST(request: NextRequest) {
  try {
    // ── Read raw body first (needed for HMAC verification) ──
    const rawBody = await request.text();

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Resend Webhook] Signature verification failed: RESEND_WEBHOOK_SECRET is not configured on the server');
      return NextResponse.json(
        { error: 'Webhook signature verification is not configured on the server' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('svix-signature');
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');

    if (!signature || !svixId || !svixTimestamp) {
      return NextResponse.json(
        { error: 'Missing webhook signature headers' },
        { status: 401 },
      );
    }

    // Svix signs: "${svixId}.${svixTimestamp}.${rawBody}"
    // Secret is stored as "whsec_<base64>" — strip the prefix
    const secretBytes = Buffer.from(
      webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret,
      'base64',
    );
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const computed = createHmac('sha256', secretBytes).update(toSign).digest('base64');

    // Svix header format: "v1,<base64sig> v1,<base64sig2> …"
    const signatures = signature.split(' ').map((s) => s.replace(/^v\d+,/, ''));
    const verified = signatures.some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
      } catch {
        return false;
      }
    });

    if (!verified) {
      console.warn('[Resend Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ── Parse Event Payload ────────────────────────────────
    const payload = JSON.parse(rawBody);

    const eventType: string = payload.type;
    const eventData = payload.data;

    if (!eventType || !eventData) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // ── Map Event → Status ─────────────────────────────────
    const status = EVENT_STATUS_MAP[eventType];

    if (!status) {
      // Unknown event type — acknowledge but don't process
      console.log(`[Resend Webhook] Ignored event type: ${eventType}`);
      return NextResponse.json({ received: true, processed: false });
    }

    // ── Extract Message ID ─────────────────────────────────
    const messageId: string | undefined =
      eventData.email_id || eventData.message_id || eventData.id;

    if (!messageId) {
      console.warn(`[Resend Webhook] No message_id in ${eventType} event`);
      return NextResponse.json({ received: true, processed: false });
    }

    // ── Parse Timestamp ────────────────────────────────────
    const timestamp = eventData.created_at
      ? new Date(eventData.created_at)
      : new Date();

    // ── Update Delivery Status ─────────────────────────────
    const result = await CommunicationEngine.updateDeliveryStatus(
      messageId,
      status,
      timestamp,
    );

    console.log(
      `[Resend Webhook] ${eventType} → ${status} | msg=${messageId} | updated=${result.updated}`,
    );

    return NextResponse.json({
      received: true,
      processed: true,
      status,
      messageId,
      updated: result.updated,
    });
  } catch (error: any) {
    console.error('[Resend Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 },
    );
  }
}

/**
 * HEAD/GET — Resend sends a verification request on webhook registration.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'PaperWorking Email Webhook' });
}
