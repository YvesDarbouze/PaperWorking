import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { VerifyIdTokenFn } from '../../../lib/auth/id-token-auth.js';
import {
  createMockCheckoutSession,
  shouldUseMockCheckout,
} from '../../../lib/stripe/mock-checkout.js';
import {
  getCanonicalPlanName,
  PLAN_CATALOG,
  resolvePlanId,
  resolveStripePriceId,
  type BillingInterval,
  type PlanId,
} from '../../../lib/stripe/plans.js';

export interface StripeCheckoutBody {
  plan?: unknown;
  billingInterval?: unknown;
  userEmail?: unknown;
  idToken?: unknown;
}

export interface CheckoutSessionResult {
  url: string;
}

export type CreateStripeCheckoutSessionFn = (input: {
  planId: PlanId;
  interval: BillingInterval;
  verifiedUserId: string;
  userEmail?: string;
  priceId: string;
  canonicalPlan: string;
  trialDays: number;
  appUrl: string;
}) => Promise<CheckoutSessionResult>;

export interface StripeCheckoutPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  createSession?: CreateStripeCheckoutSessionFn;
  useMockCheckout?: () => boolean;
  appUrl?: string;
}

/**
 * POST /api/stripe/checkout — subscription checkout session creation.
 */
export async function handleStripeCheckoutPost(
  body: StripeCheckoutBody,
  deps: StripeCheckoutPostDeps = {},
): Promise<RouteResult> {
  try {
    const plan = typeof body.plan === 'string' ? body.plan : '';
    const billingInterval = body.billingInterval === 'annual' ? 'annual' : 'monthly';
    const userEmail = typeof body.userEmail === 'string' ? body.userEmail : undefined;
    const idToken = typeof body.idToken === 'string' ? body.idToken : undefined;
    const appUrl = deps.appUrl ?? 'http://localhost:3000';

    if (!plan) {
      return jsonResponse(400, { error: 'Missing required `plan` field.' });
    }

    const planId = resolvePlanId(plan);
    if (!planId) {
      const validNames = Object.values(PLAN_CATALOG)
        .map((p) => p.displayName)
        .join(', ');
      return jsonResponse(400, {
        error: `Unrecognized plan "${plan}". Valid plans: ${validNames}`,
      });
    }

    const interval: BillingInterval = billingInterval;
    const useMock = deps.useMockCheckout ?? shouldUseMockCheckout;

    if (useMock()) {
      const { id } = createMockCheckoutSession({ planId, interval, email: userEmail });
      return jsonResponse(200, { url: `${appUrl}/checkout/success?session_id=${id}` });
    }

    if (!idToken) {
      return jsonResponse(401, { error: 'Sign in required before checkout.' });
    }

    if (!deps.verifyIdToken) {
      return jsonResponse(401, { error: 'Invalid auth token.' });
    }

    const decoded = await deps.verifyIdToken(idToken);
    if (!decoded) {
      return jsonResponse(401, { error: 'Invalid auth token.' });
    }

    const priceId = resolveStripePriceId(planId, interval);
    if (!priceId) {
      const planConfig = PLAN_CATALOG[planId];
      const envVarHint = planConfig.envVars[interval].join(' or ');
      return jsonResponse(400, {
        error: `No Stripe Price ID configured for "${planConfig.displayName}" (${interval}). Set ${envVarHint} in your environment.`,
      });
    }

    if (!deps.createSession) {
      return jsonResponse(500, {
        error: 'An error occurred while creating the checkout session. Please try again.',
      });
    }

    const canonicalPlan = getCanonicalPlanName(planId);
    const trialDays = PLAN_CATALOG[planId].trialDays;
    const session = await deps.createSession({
      planId,
      interval,
      verifiedUserId: decoded.uid,
      userEmail,
      priceId,
      canonicalPlan,
      trialDays,
      appUrl,
    });

    return jsonResponse(200, { url: session.url });
  } catch (error: unknown) {
    const err = error as {
      type?: string;
      code?: string;
      param?: string;
      message?: string;
      name?: string;
      statusCode?: number;
    };
    const isStripeError = typeof err?.type === 'string' && err.type.startsWith('Stripe');
    console.error('[Stripe Checkout] Session creation failed', {
      name: err?.name,
      type: err?.type,
      code: err?.code,
      param: err?.param,
      statusCode: err?.statusCode,
      message: err?.message,
    });

    const showDetail = isStripeError || process.env.NODE_ENV !== 'production';
    return jsonResponse(500, {
      error: 'An error occurred while creating the checkout session. Please try again.',
      ...(showDetail && err?.message ? { detail: err.message } : {}),
      ...(isStripeError
        ? { type: err.type, code: err.code ?? null, param: err.param ?? null }
        : {}),
    });
  }
}
