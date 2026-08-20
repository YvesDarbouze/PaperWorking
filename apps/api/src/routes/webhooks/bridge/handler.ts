import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  parseBridgeWebhookPayload,
  verifyBridgeWebhookHmac,
} from '../../../lib/webhooks/bridge-hmac.js';

export type EnqueueBridgeWebhookFn = (payload: unknown) => Promise<string>;
export type ProcessBridgeWebhookSyncFn = (
  payload: unknown,
) => Promise<{ success: boolean; reason?: string; count?: number }>;

export interface BridgeWebhookHeaders {
  bridgeSignature?: string | null;
  hubSignature?: string | null;
}

export interface BridgeWebhookPostDeps {
  webhookSecret?: string;
  enqueueWebhook?: EnqueueBridgeWebhookFn;
  processWebhookSync?: ProcessBridgeWebhookSyncFn;
}

/**
 * POST /api/webhooks/bridge
 */
export async function handleBridgeWebhookPost(
  rawBody: string,
  headers: BridgeWebhookHeaders = {},
  deps: BridgeWebhookPostDeps = {},
): Promise<RouteResult> {
  const webhookSecret = deps.webhookSecret;
  if (!webhookSecret) {
    console.error('[Bridge Webhook] BRIDGE_WEBHOOK_SECRET not configured — rejecting request');
    return jsonResponse(503, { error: 'Webhook endpoint not configured' });
  }

  const signature = headers.bridgeSignature ?? headers.hubSignature ?? null;
  if (!verifyBridgeWebhookHmac(rawBody, signature, webhookSecret)) {
    console.warn('[Bridge Webhook] HMAC signature mismatch — rejecting payload');
    return jsonResponse(401, { error: 'invalid_signature' });
  }

  let payload: unknown;
  try {
    payload = parseBridgeWebhookPayload(rawBody);
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  try {
    const jobId = deps.enqueueWebhook ? await deps.enqueueWebhook(payload) : `job_${Date.now()}`;
    return jsonResponse(200, { accepted: true, jobId });
  } catch (queueError: unknown) {
    const message = queueError instanceof Error ? queueError.message : String(queueError);
    console.warn('[Bridge Webhook] Queue unavailable — falling back to sync processing', { detail: message });
    try {
      const result = deps.processWebhookSync
        ? await deps.processWebhookSync(payload)
        : { success: true, count: 0 };
      if (!result.success) {
        return jsonResponse(422, { error: result.reason ?? 'processing_failed' });
      }
      return jsonResponse(200, { processed: true, affectedDeals: result.count });
    } catch (syncError: unknown) {
      console.error('[Bridge Webhook] Sync fallback failed', syncError);
      return jsonResponse(500, { error: 'internal_server_error' });
    }
  }
}
