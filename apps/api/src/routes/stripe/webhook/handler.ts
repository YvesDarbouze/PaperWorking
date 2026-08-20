import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { dispatchStripeWebhookEvent } from '../../../lib/stripe/webhook/dispatch.js';
import type {
  ConstructStripeEventFn,
  IsStripeEventProcessedFn,
  MarkStripeEventProcessedFn,
  StripeWebhookEvent,
} from '../../../lib/stripe/webhook/types.js';
import type { StripeWebhookDispatchDeps } from '../../../lib/stripe/webhook/dispatch.js';

export interface StripeWebhookPostDeps extends StripeWebhookDispatchDeps {
  constructEvent?: ConstructStripeEventFn;
  isEventProcessed?: IsStripeEventProcessedFn;
  markEventProcessed?: MarkStripeEventProcessedFn;
  dispatchEvent?: (event: StripeWebhookEvent) => Promise<void>;
}

/**
 * POST /api/stripe/webhook — migrated from PaperWorking.
 */
export async function handleStripeWebhookPost(
  rawBody: string,
  signature: string | null,
  deps: StripeWebhookPostDeps = {},
): Promise<RouteResult> {
  if (!signature || !deps.constructEvent) {
    return jsonResponse(400, { error: 'Webhook Error: missing signature or verifier' });
  }

  let event: StripeWebhookEvent;
  try {
    event = deps.constructEvent(rawBody, signature);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Stripe Webhook Signature Verification Failed:', message);
    return jsonResponse(400, { error: `Webhook Error: ${message}` });
  }

  if (deps.isEventProcessed && (await deps.isEventProcessed(event.id))) {
    return jsonResponse(200, { received: true, deduplicated: true });
  }

  try {
    const dispatch = deps.dispatchEvent ?? ((e) => dispatchStripeWebhookEvent(e, deps));
    await dispatch(event);

    if (deps.markEventProcessed) {
      await deps.markEventProcessed(event.id, event.type);
    }
  } catch (processingError: unknown) {
    const message = processingError instanceof Error ? processingError.message : String(processingError);
    console.error('[Stripe Webhook] Processing error:', message);
    return jsonResponse(500, { error: `Processing failed: ${message}` });
  }

  return jsonResponse(200, { received: true });
}
