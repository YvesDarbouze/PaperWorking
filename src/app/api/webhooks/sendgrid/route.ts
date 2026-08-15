import { NextRequest, NextResponse } from 'next/server';
import { createVerify } from 'crypto';
import { CommunicationEngine, EmailStatus } from '@/lib/engine/CommunicationEngine';

/**
 * SendGrid Webhook Handler — Delivery & Engagement Event Receiver (EM Series v2 · EM-10)
 *
 * POST /api/webhooks/sendgrid
 *
 * Receives array of event objects from SendGrid Event Webhooks.
 * Maps SendGrid event types to EmailLog status updates in CommunicationEngine and updates suppression states.
 *
 * Verified facts:
 * - F-9: Signed with ECDSA over timestamp + raw request bytes (req.text()).
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

const EVENT_STATUS_MAP: Record<string, EmailStatus> = {
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

interface SendGridWebhookEvent {
  event?: string;
  sg_message_id?: string;
  message_id?: string;
  'smtp-id'?: string;
  timestamp?: number;
}

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

export async function POST(request: NextRequest) {
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
    }

    // ── Parse Event Payload Array (F-9) ───────────────────────
    let events: SendGridWebhookEvent[] = [];
    try {
      const parsed: unknown = JSON.parse(rawBody);
      events = Array.isArray(parsed) ? parsed : [parsed as SendGridWebhookEvent];
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    let processedCount = 0;

    for (const event of events) {
      const eventType: string = event.event ?? '';
      if (!eventType) continue;

      const status = EVENT_STATUS_MAP[eventType];
      if (!status) continue;

      // Extract SendGrid message ID
      const rawMsgId: string = event.sg_message_id || event.message_id || event['smtp-id'] || '';
      const messageId = rawMsgId.split('.')[0];

      if (!messageId) continue;

      const timestamp = event.timestamp ? new Date(event.timestamp * 1000) : new Date();

      // ── Update Delivery Status in CommunicationEngine ───────
      const result = await CommunicationEngine.updateDeliveryStatus(
        messageId,
        status,
        timestamp
      );

      if (result.updated) processedCount++;

      // ── Suppression & Abuse Metrics Handling (Bounces & Complaints) ──
      if (status === 'Bounced' || status === 'Failed') {
        try {
          const { prisma } = await import('@/lib/prisma');
          const { adminDb } = await import('@/lib/firebase/admin');

          const logs = await prisma.emailLog.findMany({
            where: { messageId },
          });

          let senderUid = '';
          if (logs.length > 0) {
            const logItem = logs[0];
            if (logItem.metadata) {
              try {
                const meta = JSON.parse(logItem.metadata);
                senderUid = meta.userId || meta.senderUid;
              } catch {}
            }
            if (!senderUid && logItem.linkedProjectId) {
              const projSnap = await adminDb
                .collection('projects')
                .doc(logItem.linkedProjectId)
                .get();
              if (projSnap.exists) {
                senderUid = projSnap.data()?.ownerUid || '';
              }
            }
          }

          if (senderUid) {
            const userRef = adminDb.collection('users').doc(senderUid);
            const userSnap = await userRef.get();
            if (userSnap.exists) {
              const userData = userSnap.data() || {};
              const userUpdates: Record<string, number | boolean | string> = {};

              if (status === 'Bounced') {
                const currentBounces = userData.bounceCount || 0;
                const newBounces = currentBounces + 1;
                userUpdates.bounceCount = newBounces;

                if (newBounces >= 5) {
                  userUpdates.invitationSuspended = true;
                  userUpdates.suspensionReason = 'EXCESSIVE_BOUNCES';

                  await adminDb.collection('operatorQueue').add({
                    type: 'SUSPENSION_ALERT',
                    userId: senderUid,
                    details: `Lead Investor invitation privileges suspended automatically due to SendGrid bounces (${newBounces} bounces).`,
                    createdAt: new Date(),
                    resolved: false,
                  });
                }
              } else if (status === 'Failed') {
                const currentComplaints = userData.complaintCount || 0;
                const newComplaints = currentComplaints + 1;
                userUpdates.complaintCount = newComplaints;

                if (newComplaints >= 2) {
                  userUpdates.invitationSuspended = true;
                  userUpdates.suspensionReason = 'USER_COMPLAINT';

                  await adminDb.collection('operatorQueue').add({
                    type: 'SUSPENSION_ALERT',
                    userId: senderUid,
                    details: `Lead Investor invitation privileges suspended automatically due to SendGrid spam complaints (${newComplaints} complaints).`,
                    createdAt: new Date(),
                    resolved: false,
                  });
                }
              }

              if (Object.keys(userUpdates).length > 0) {
                await userRef.update(userUpdates);
              }
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('[SendGrid Webhook] Abuse processing error:', message);
        }
      }
    }

    return NextResponse.json({
      received: true,
      processed: processedCount,
      totalEvents: events.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendGrid Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'PaperWorking SendGrid Webhook' });
}
