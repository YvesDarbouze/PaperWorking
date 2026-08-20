import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { EmailStatus } from '../../../lib/email/sendgrid-events.js';
import {
  eventTimestamp,
  extractSendGridMessageId,
  mapSendGridEventType,
  parseSendGridWebhookPayload,
  type SendGridWebhookEvent,
} from '../../../lib/email/sendgrid-events.js';
import {
  isMockSendGridSignature,
  verifySendGridSignature,
} from '../../../lib/email/sendgrid-signature.js';

export interface SendGridWebhookHeaders {
  signature?: string | null;
  timestamp?: string | null;
}

export type UpdateDeliveryStatusFn = (
  messageId: string,
  status: EmailStatus,
  timestamp: Date,
) => Promise<{ updated: number }>;

export type ProcessAbuseMetricsFn = (
  messageId: string,
  status: 'Bounced' | 'Failed',
) => Promise<void>;

export interface SendGridWebhookPostDeps {
  verificationKey?: string;
  nodeEnv?: string;
  verifySignature?: typeof verifySendGridSignature;
  updateDeliveryStatus?: UpdateDeliveryStatusFn;
  processAbuseMetrics?: ProcessAbuseMetricsFn;
}

async function processSendGridEvents(
  events: SendGridWebhookEvent[],
  deps: SendGridWebhookPostDeps,
): Promise<number> {
  let processedCount = 0;

  for (const event of events) {
    const eventType = event.event || '';
    if (!eventType) continue;

    const status = mapSendGridEventType(eventType);
    if (!status) continue;

    const messageId = extractSendGridMessageId(event);
    if (!messageId) continue;

    if (deps.updateDeliveryStatus) {
      const result = await deps.updateDeliveryStatus(messageId, status, eventTimestamp(event));
      if (result.updated > 0) processedCount++;
    }

    if ((status === 'Bounced' || status === 'Failed') && deps.processAbuseMetrics) {
      try {
        await deps.processAbuseMetrics(messageId, status);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[SendGrid Webhook] Abuse processing error:', message);
      }
    }
  }

  return processedCount;
}

/**
 * GET /api/webhooks/sendgrid — health probe.
 */
export async function handleSendGridWebhookGet(): Promise<RouteResult> {
  return jsonResponse(200, { status: 'ok', service: 'PaperWorking SendGrid Webhook' });
}

/**
 * POST /api/webhooks/sendgrid — delivery & engagement events (EM-10).
 */
export async function handleSendGridWebhookPost(
  rawBody: string,
  headers: SendGridWebhookHeaders = {},
  deps: SendGridWebhookPostDeps = {},
): Promise<RouteResult> {
  try {
    const verificationKey = deps.verificationKey ?? process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

    if (verificationKey) {
      const verify = deps.verifySignature ?? verifySendGridSignature;
      const nodeEnv = deps.nodeEnv ?? process.env.NODE_ENV;
      let isValid = isMockSendGridSignature(headers.signature ?? null, nodeEnv);

      if (!isValid) {
        isValid = verify(
          rawBody,
          headers.signature ?? null,
          headers.timestamp ?? null,
          verificationKey,
        );
      }

      if (!isValid) {
        console.warn('[SendGrid Webhook] Signature verification failed');
        return jsonResponse(401, { error: 'Invalid signature' });
      }
    }

    let events: SendGridWebhookEvent[];
    try {
      events = parseSendGridWebhookPayload(rawBody);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON payload' });
    }

    const processedCount = await processSendGridEvents(events, deps);

    return jsonResponse(200, {
      received: true,
      processed: processedCount,
      totalEvents: events.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SendGrid Webhook] Error:', message);
    return jsonResponse(500, { error: 'Webhook processing failed', details: message });
  }
}
