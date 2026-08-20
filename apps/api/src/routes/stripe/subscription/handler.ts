import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type {
  GetStripeCustomerIdFn,
  VerifyIdTokenFn,
} from '../../../lib/auth/id-token-auth.js';

export interface StripeSubscriptionBody {
  idToken?: unknown;
}

export type GetActiveSubscriptionPeriodEndFn = (
  stripeCustomerId: string,
) => Promise<number | null>;

export interface StripeSubscriptionPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getStripeCustomerId?: GetStripeCustomerIdFn;
  getCurrentPeriodEnd?: GetActiveSubscriptionPeriodEndFn;
}

/**
 * POST /api/stripe/subscription — active subscription period end.
 */
export async function handleStripeSubscriptionPost(
  body: StripeSubscriptionBody,
  deps: StripeSubscriptionPostDeps = {},
): Promise<RouteResult> {
  try {
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';

    if (!idToken) {
      return jsonResponse(400, { error: 'Missing idToken.' });
    }

    if (!deps.verifyIdToken) {
      return jsonResponse(401, { error: 'Invalid or expired token.' });
    }

    const decoded = await deps.verifyIdToken(idToken);
    if (!decoded) {
      return jsonResponse(401, { error: 'Invalid or expired token.' });
    }

    const stripeCustomerId = deps.getStripeCustomerId
      ? await deps.getStripeCustomerId(decoded.uid)
      : null;

    if (!stripeCustomerId || !deps.getCurrentPeriodEnd) {
      return jsonResponse(200, { currentPeriodEnd: null });
    }

    const currentPeriodEnd = await deps.getCurrentPeriodEnd(stripeCustomerId);
    return jsonResponse(200, { currentPeriodEnd });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe/Subscription] Error:', msg);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
