import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  parsePlaidWebhookPayload,
  plaidEventType,
  type PlaidWebhookPayload,
} from '../../../lib/webhooks/plaid-events.js';

export interface PlaidVerificationResult {
  isValid: boolean;
}

export type VerifyPlaidWebhookFn = (
  verificationHeader: string | null,
  rawBody: string,
  context?: { requestPath?: string },
) => Promise<PlaidVerificationResult>;

export interface PlaidWebhookProcessContext {
  payload: PlaidWebhookPayload;
  itemId: string;
  eventType: string;
  webhookLogId: string | null;
}

export type LogPlaidWebhookFn = (
  eventType: string,
  itemId: string,
  payload: PlaidWebhookPayload,
) => Promise<string | null>;

export type ProcessPlaidWebhookFn = (ctx: PlaidWebhookProcessContext) => Promise<void>;

export interface PlaidWebhookPostDeps {
  verifyWebhook?: VerifyPlaidWebhookFn;
  logWebhook?: LogPlaidWebhookFn;
  processWebhook?: ProcessPlaidWebhookFn;
  requestPath?: string;
}

export interface PlaidWebhookHeaders {
  plaidVerification?: string | null;
}

/**
 * POST /api/webhooks/plaid — JWT-verified Plaid webhook intake.
 */
export async function handlePlaidWebhookPost(
  rawBody: string,
  headers: PlaidWebhookHeaders = {},
  deps: PlaidWebhookPostDeps = {},
): Promise<RouteResult> {
  if (!deps.verifyWebhook) {
    return jsonResponse(400, { error: 'Plaid webhook verifier not configured' });
  }

  const verificationHeader =
    headers.plaidVerification ?? null;

  const verificationResult = await deps.verifyWebhook(verificationHeader, rawBody, {
    requestPath: deps.requestPath ?? '/api/webhooks/plaid',
  });

  if (!verificationResult.isValid) {
    return jsonResponse(401, { error: 'Invalid webhook signature' });
  }

  let payload: PlaidWebhookPayload;
  try {
    payload = parsePlaidWebhookPayload(rawBody);
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const itemId = payload.item_id;
  if (!itemId || typeof itemId !== 'string') {
    return jsonResponse(400, { error: 'Missing item_id' });
  }

  const eventType = plaidEventType(payload);

  let webhookLogId: string | null = null;
  if (deps.logWebhook) {
    try {
      webhookLogId = await deps.logWebhook(eventType, itemId, payload);
    } catch (err: unknown) {
      console.error('[Plaid Webhook] Audit logging failed:', err);
    }
  }

  if (deps.processWebhook) {
    try {
      await deps.processWebhook({
        payload,
        itemId,
        eventType,
        webhookLogId,
      });
    } catch (handlerErr: unknown) {
      console.error(`[Plaid Webhook] Error processing ${eventType}:`, handlerErr);
    }
  }

  return jsonResponse(200, { received: true });
}
