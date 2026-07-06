import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebase/admin';
import {
  resolvePlanId,
  resolveStripePriceId,
  getCanonicalPlanName,
  PLAN_CATALOG,
  type BillingInterval,
} from '@/lib/stripe/plans';
import { shouldUseMockCheckout, createMockCheckoutSession } from '@/lib/stripe/mockCheckout';

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  // @ts-ignore - using latest api version locally
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
}

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for subscription sign-up.
 * Supports guest checkout (no auth required) and authenticated checkout.
 *
 * Body: { plan, billingInterval?, userEmail?, idToken? }
 * Returns: { url: string }
 */
export async function POST(request: Request) {
  try {
    const { plan, billingInterval = 'monthly', userEmail, idToken } = await request.json();

    if (!plan) {
      return NextResponse.json({ error: 'Missing required `plan` field.' }, { status: 400 });
    }

    // ── Plan Resolution ──────────────────────────────────
    // Accept any known display name, alias, or canonical ID
    const planId = resolvePlanId(plan);
    if (!planId) {
      const validNames = Object.values(PLAN_CATALOG).map((p) => p.displayName).join(', ');
      return NextResponse.json(
        { error: `Unrecognized plan "${plan}". Valid plans: ${validNames}` },
        { status: 400 }
      );
    }

    const interval: BillingInterval = billingInterval === 'annual' ? 'annual' : 'monthly';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ── Mock Fallback (no Stripe credentials) ────────────
    // Keeps the app runnable without a real Stripe key: simulate a completed
    // Checkout Session and route to the success page, which resolves the mock
    // session id via /api/stripe/session-status. See mockCheckout.ts.
    if (shouldUseMockCheckout()) {
      const { id } = createMockCheckoutSession({ planId, interval, email: userEmail });
      return NextResponse.json({ url: `${appUrl}/checkout/success?session_id=${id}` });
    }

    const stripe = getStripe();

    // ── Auth Verification & Identity Derivation ──
    let verifiedUserId: string | undefined = undefined;
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken, true);
        verifiedUserId = decoded.uid;
      } catch {
        return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 });
      }
    }

    // ── Price ID Resolution ──────────────────────────────
    const priceId = resolveStripePriceId(planId, interval);

    if (!priceId) {
      const planConfig = PLAN_CATALOG[planId];
      const envVarHint = planConfig.envVars[interval].join(' or ');
      return NextResponse.json(
        { error: `No Stripe Price ID configured for "${planConfig.displayName}" (${interval}). Set ${envVarHint} in your environment.` },
        { status: 400 }
      );
    }

    // ── Session Creation ─────────────────────────────────
    const canonicalPlan = getCanonicalPlanName(planId);
    const trialDays = PLAN_CATALOG[planId].trialDays;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',

      // Always collect a payment method — even during a free trial.
      // The card is saved and authorised but NOT charged until the trial ends.
      payment_method_collection: 'always',

      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: userEmail ?? undefined,
      client_reference_id: verifiedUserId ?? undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },

      // Cast to any: `trial_settings` isn't in the pinned @types/stripe yet.
      // NOTE: do NOT add `payment_settings` here — it is a Subscriptions API
      // field, not a valid `subscription_data` param, and Stripe rejects it
      // ("Received unknown parameter: subscription_data[payment_settings]"),
      // failing the whole request. In Checkout `mode: 'subscription'` the card
      // collected is already saved as the subscription's default payment method
      // and auto-charged when the trial converts on day 15.
      subscription_data: {
        // 14-day free trial — card collected but not charged until day 15.
        trial_period_days: trialDays > 0 ? trialDays : undefined,

        // Cancel if the card fails at trial end (no silent free-ride).
        ...(trialDays > 0 && {
          trial_settings: {
            end_behavior: { missing_payment_method: 'cancel' },
          },
        }),

        metadata: {
          userId: verifiedUserId || 'guest',
          plan: canonicalPlan,
          planId,
        },
      } as any,

      metadata: {
        userId: verifiedUserId || 'guest',
        plan: canonicalPlan,
        planId,
        billingInterval: interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    // Stripe SDK errors carry structured, NON-secret identifiers (type/code/param).
    // Log them fully so the cause is visible in server logs (App Hosting) even in prod.
    const isStripeError = typeof error?.type === 'string' && error.type.startsWith('Stripe');
    console.error('[Stripe Checkout] Session creation failed', {
      name: error?.name,
      type: error?.type,
      code: error?.code,
      param: error?.param,
      statusCode: error?.statusCode,
      message: error?.message,
    });

    // Return the actionable reason to the caller. A Stripe config error
    // (e.g. automatic_tax not set up, or a live/test price-vs-key mismatch)
    // is safe to surface — it contains no secret keys. Unexpected errors are
    // only detailed outside production.
    const showDetail = isStripeError || process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      {
        error: 'An error occurred while creating the checkout session. Please try again.',
        ...(showDetail && error?.message ? { detail: error.message } : {}),
        ...(isStripeError ? { type: error.type, code: error.code ?? null, param: error.param ?? null } : {}),
      },
      { status: 500 }
    );
  }
}
