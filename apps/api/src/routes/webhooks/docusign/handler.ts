import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  parseDocuSignWebhookEvent,
  verifyDocuSignSignature,
  type DocuSignWebhookEvent,
} from '../../../lib/webhooks/docusign-events.js';

export type ReconcileDocuSignEnvelopeFn = (event: DocuSignWebhookEvent) => Promise<void>;

export interface DocuSignWebhookPostDeps {
  hmacKey?: string;
  reconcileEnvelope?: ReconcileDocuSignEnvelopeFn;
}

export interface DocuSignWebhookHeaders {
  signature?: string | null;
}

/**
 * POST /api/webhooks/docusign — HMAC-verified DocuSign Connect webhook.
 */
export async function handleDocuSignWebhookPost(
  rawBody: string,
  headers: DocuSignWebhookHeaders = {},
  deps: DocuSignWebhookPostDeps = {},
): Promise<RouteResult> {
  const hmacKey = deps.hmacKey;
  if (!hmacKey) {
    console.error('[DocuSign Webhook] DOCUSIGN_WEBHOOK_HMAC_KEY not configured — rejecting request');
    return jsonResponse(503, { error: 'Webhook endpoint not configured' });
  }

  const signature = headers.signature ?? null;
  if (!verifyDocuSignSignature(rawBody, signature, hmacKey)) {
    console.warn('[webhooks/docusign] Invalid HMAC signature');
    return jsonResponse(401, { error: 'Invalid signature' });
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const event = parseDocuSignWebhookEvent(raw);
  if (!event) {
    console.warn('[webhooks/docusign] Missing envelopeId or status in payload');
    return jsonResponse(200, { received: true });
  }

  if (!event.isFinal) {
    return jsonResponse(200, { received: true });
  }

  if (deps.reconcileEnvelope) {
    try {
      await deps.reconcileEnvelope(event);
    } catch (error: unknown) {
      console.error('[webhooks/docusign] Error reconciling envelope', error);
      return jsonResponse(500, { error: 'Internal error' });
    }
  }

  return jsonResponse(200, { received: true });
}
