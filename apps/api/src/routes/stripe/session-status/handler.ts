import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { mapCheckoutSessionStatus } from '../../../lib/stripe/billing-mappers.js';
import {
  getMockSessionStatus,
  isMockSessionId,
  shouldUseMockCheckout,
} from '../../../lib/stripe/mock-checkout.js';
import type { RawCheckoutSession } from '../../../lib/stripe/billing-mappers.js';

export interface SessionStatusQuery {
  session_id?: string;
}

export type RetrieveCheckoutSessionFn = (
  sessionId: string,
) => Promise<RawCheckoutSession>;

export interface StripeSessionStatusGetDeps {
  retrieveSession?: RetrieveCheckoutSessionFn;
  useMockCheckout?: () => boolean;
}

/**
 * GET /api/stripe/session-status — post-checkout confirmation.
 */
export async function handleStripeSessionStatusGet(
  query: SessionStatusQuery = {},
  deps: StripeSessionStatusGetDeps = {},
): Promise<RouteResult> {
  const sessionId = query.session_id;

  if (!sessionId) {
    return jsonResponse(400, { error: 'Missing session_id query parameter' });
  }

  const useMock = deps.useMockCheckout ?? shouldUseMockCheckout;

  if (useMock() && isMockSessionId(sessionId)) {
    const status = getMockSessionStatus(sessionId);
    if (!status) {
      return jsonResponse(404, { error: 'Invalid or expired session' });
    }
    return jsonResponse(200, status);
  }

  if (!deps.retrieveSession) {
    return jsonResponse(500, { error: 'Failed to retrieve session status' });
  }

  try {
    const session = await deps.retrieveSession(sessionId);
    return jsonResponse(200, mapCheckoutSessionStatus(session));
  } catch (error: unknown) {
    console.error('[Session Status]', error);
    const stripeType =
      error && typeof error === 'object' && 'type' in error
        ? (error as { type?: string }).type
        : undefined;

    if (stripeType === 'StripeInvalidRequestError') {
      return jsonResponse(404, { error: 'Invalid or expired session' });
    }

    return jsonResponse(500, { error: 'Failed to retrieve session status' });
  }
}
