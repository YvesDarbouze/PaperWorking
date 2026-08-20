import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type {
  GetStripeCustomerIdFn,
  VerifyIdTokenFn,
} from '../../../lib/auth/id-token-auth.js';
import {
  mapPaymentMethodCard,
  type RawPaymentMethodCard,
} from '../../../lib/stripe/billing-mappers.js';

export interface StripePaymentMethodBody {
  idToken?: unknown;
}

export type GetDefaultPaymentMethodFn = (
  stripeCustomerId: string,
) => Promise<RawPaymentMethodCard | null>;

export interface StripePaymentMethodPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getStripeCustomerId?: GetStripeCustomerIdFn;
  getDefaultPaymentMethod?: GetDefaultPaymentMethodFn;
}

/**
 * POST /api/stripe/payment-method — default card on file.
 */
export async function handleStripePaymentMethodPost(
  body: StripePaymentMethodBody,
  deps: StripePaymentMethodPostDeps = {},
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

    if (!stripeCustomerId || !deps.getDefaultPaymentMethod) {
      return jsonResponse(200, { paymentMethod: null });
    }

    const card = await deps.getDefaultPaymentMethod(stripeCustomerId);
    if (!card) {
      return jsonResponse(200, { paymentMethod: null });
    }

    return jsonResponse(200, { paymentMethod: mapPaymentMethodCard(card) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe/PaymentMethod] Error:', msg);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
