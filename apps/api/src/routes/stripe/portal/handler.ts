import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type {
  GetStripeCustomerIdFn,
  VerifyIdTokenFn,
} from '../../../lib/auth/id-token-auth.js';

export interface StripePortalBody {
  idToken?: unknown;
}

export type CreateBillingPortalSessionFn = (
  stripeCustomerId: string,
  returnUrl: string,
) => Promise<{ url: string }>;

export interface StripePortalPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getStripeCustomerId?: GetStripeCustomerIdFn;
  createPortalSession?: CreateBillingPortalSessionFn;
  appUrl?: string;
}

/**
 * POST /api/stripe/portal — Stripe Customer Portal session.
 */
export async function handleStripePortalPost(
  body: StripePortalBody,
  deps: StripePortalPostDeps = {},
): Promise<RouteResult> {
  try {
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';

    if (!idToken) {
      return jsonResponse(401, { error: 'Authentication required.' });
    }

    if (!deps.verifyIdToken) {
      return jsonResponse(401, { error: 'Invalid authentication token.' });
    }

    const decoded = await deps.verifyIdToken(idToken);
    if (!decoded) {
      return jsonResponse(401, { error: 'Invalid authentication token.' });
    }

    const stripeCustomerId = deps.getStripeCustomerId
      ? await deps.getStripeCustomerId(decoded.uid)
      : null;

    if (!stripeCustomerId) {
      return jsonResponse(404, {
        error: 'No active subscription found. Please subscribe first.',
      });
    }

    if (!deps.createPortalSession) {
      return jsonResponse(500, { error: 'Failed to create portal session' });
    }

    const appUrl = deps.appUrl ?? 'http://localhost:3000';
    const portalSession = await deps.createPortalSession(
      stripeCustomerId,
      `${appUrl}/dashboard/settings/billing`,
    );

    return jsonResponse(200, { url: portalSession.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create portal session';
    console.error('[Stripe Portal]', message);
    return jsonResponse(500, { error: message });
  }
}
