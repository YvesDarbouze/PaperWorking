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
 * Body: { plan, billingInterval?, userId?, userEmail?, idToken? }
 * Returns: { url: string }
 */
export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const { plan, billingInterval = 'monthly', userId, userEmail, idToken } = await request.json();

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

    // ── Auth Verification (optional — guest checkout allowed) ──
    if (idToken && userId) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (decoded.uid !== userId) {
          return NextResponse.json({ error: 'Token / user mismatch.' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 });
      }
    }

    // ── Price ID Resolution ──────────────────────────────
    const interval: BillingInterval = billingInterval === 'annual' ? 'annual' : 'monthly';
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',

      // Always collect a payment method — even during a free trial.
      // The card is saved and authorised but NOT charged until the trial ends.
      payment_method_collection: 'always',

      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: userEmail ?? undefined,
      client_reference_id: userId ?? undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },

      // Cast to any: the dahlia API version exposes payment_settings and
      // trial_settings fields that the current @types/stripe hasn't caught up to.
      subscription_data: {
        // 14-day free trial — card collected but not charged until day 15.
        trial_period_days: trialDays > 0 ? trialDays : undefined,

        // Cancel if the card fails at trial end (no silent free-ride).
        ...(trialDays > 0 && {
          trial_settings: {
            end_behavior: { missing_payment_method: 'cancel' },
          },
        }),

        // Save the collected card as the default payment method so Stripe
        // can charge it automatically when the trial converts on day 15.
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },

        metadata: {
          userId: userId || 'guest',
          plan: canonicalPlan,
          planId,
        },
      } as any,

      metadata: {
        userId: userId || 'guest',
        plan: canonicalPlan,
        planId,
        billingInterval: interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout]', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
