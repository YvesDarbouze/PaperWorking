import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  parseInboundEmailPayload,
  type InboundEmailPayload,
} from '../../../lib/email/inbound-email-parser.js';

/**
 * POST /api/webhooks/inbound-email — parses inbound email into deal thread event.
 */
export async function handleInboundEmailParsePost(
  payload: InboundEmailPayload,
): Promise<RouteResult> {
  try {
    const result = parseInboundEmailPayload(payload);

    if (!result.success) {
      return jsonResponse(400, { success: false, error: result.error });
    }

    return jsonResponse(200, {
      success: true,
      message: 'Inbound email parsed and stitched into deal communications trail.',
      event: result.event,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error processing inbound email.';
    return jsonResponse(500, { success: false, error: message });
  }
}
