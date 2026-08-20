import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface InboundEmailsProcessResult {
  success: boolean;
  reason?: string;
  projectId?: string;
}

export type ProcessInboundEmailFn = (
  payload: unknown,
) => Promise<InboundEmailsProcessResult>;

export interface InboundEmailsWebhookPostDeps {
  webhookSecret?: string;
  processInbound?: ProcessInboundEmailFn;
}

/**
 * POST /api/webhooks/emails — SendGrid/Postmark inbound parse relay.
 */
export async function handleInboundEmailsWebhookPost(
  payload: unknown,
  authorizationHeader: string | null,
  deps: InboundEmailsWebhookPostDeps = {},
): Promise<RouteResult> {
  const emailSecret = deps.webhookSecret ?? process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

  if (!emailSecret) {
    console.error(
      '[Inbound Email Webhook] INBOUND_EMAIL_WEBHOOK_SECRET not configured — rejecting request',
    );
    return jsonResponse(503, { error: 'Webhook endpoint not configured' });
  }

  const authHeader = authorizationHeader ?? '';
  if (authHeader !== `Bearer ${emailSecret}`) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  try {
    if (!deps.processInbound) {
      return jsonResponse(503, { error: 'Webhook endpoint not configured' });
    }

    const result = await deps.processInbound(payload);

    if (!result.success) {
      return jsonResponse(422, { error: result.reason ?? 'processing_failed' });
    }

    return jsonResponse(200, { processed: true, projectId: result.projectId });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return jsonResponse(500, { error: 'internal_server_error' });
  }
}
