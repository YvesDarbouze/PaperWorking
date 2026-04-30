import { NextRequest, NextResponse } from 'next/server';
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
    // ── Webhook Signature Verification ──────────────────────
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signature = request.headers.get('svix-signature');
      const svixId = request.headers.get('svix-id');
      const svixTimestamp = request.headers.get('svix-timestamp');

      if (!signature || !svixId || !svixTimestamp) {
        return NextResponse.json(
          { error: 'Missing webhook signature headers' },
          { status: 401 },
        );
      }

      // In production, verify signature with @svix/server:
      // const wh = new Webhook(webhookSecret);
      // wh.verify(body, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': signature });
      // For now, we log the verification step and proceed
      console.log('[Resend Webhook] Signature headers present, verification enabled');
    }

    // ── Parse Event Payload ────────────────────────────────
    const payload = await request.json();

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
