import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  parseSourcingOwnershipShares,
  validateSourcingWebhookAuth,
  validateSourcingWebhookBody,
} from '../../../lib/webhooks/sourcing.js';

export type CreateSourcingLeadFn = (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
export type LogSourcingActivityFn = (input: {
  organizationId: string;
  sourceVendor: string;
  address?: string;
}) => Promise<void>;

/**
 * POST /api/webhooks/sourcing
 */
export async function handleWebhooksSourcingPost(
  body: Record<string, unknown>,
  headers: { authorization?: string | null },
  deps: {
    webhookSecret?: string;
    createLead?: CreateSourcingLeadFn;
    logActivity?: LogSourcingActivityFn;
  } = {},
): Promise<RouteResult> {
  const auth = validateSourcingWebhookAuth({
    webhookSecret: deps.webhookSecret ?? process.env.SOURCING_WEBHOOK_SECRET,
    authorization: headers.authorization,
  });
  if (!auth.ok) return jsonResponse(auth.status, { error: auth.error });

  try {
    const validated = validateSourcingWebhookBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const ownershipShares = parseSourcingOwnershipShares(body.ownershipShares);
    const lead = deps.createLead
      ? await deps.createLead({ ...body, ownershipShares })
      : { id: 'lead-1', ...body };

    if (deps.logActivity) {
      await deps.logActivity({
        organizationId: String(body.organizationId),
        sourceVendor: String(body.sourceVendor),
        address: typeof body.address === 'string' ? body.address : undefined,
      }).catch(() => undefined);
    }

    return jsonResponse(200, { success: true, lead });
  } catch (err: unknown) {
    console.error('[Sourcing Webhook]', err);
    return jsonResponse(500, { error: 'Internal Server Error' });
  }
}
