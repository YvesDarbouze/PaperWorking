import { NextRequest, NextResponse } from 'next/server';
import { isMockSessionId, getMockSessionStatus, shouldUseMockCheckout } from '@/lib/stripe/mockCheckout';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
}

/**
 * GET /api/stripe/session-status?session_id=cs_xxx
 *
 * Resolves a Checkout Session to its final state for the post-checkout
 * success handler. Returns plan metadata and subscription status so
 * the client can refresh its local auth context.
 *
 * Informed by Autumn V2 checkout pattern:
 *   - This is the "confirm" equivalent for a Stripe-hosted checkout
 *   - Cache is not needed because Stripe is the source of truth
 *   - Client calls this once on /dashboard?checkout=success
 *
 * Returns:
 *   { status, plan, customerEmail, subscriptionId, subscriptionStatus }
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id query parameter' },
      { status: 400 }
    );
  }

  // ── Mock Fallback ────────────────────────────────────
  // Mock ids are self-describing and only exist when Stripe is unconfigured
  // (local dev). They carry no real user/subscription data, so no auth guard
  // is needed — and the guest-checkout success flow has no token to present.
  //
  // Gate on shouldUseMockCheckout(): the prefix alone must NOT skip auth. When
  // Stripe is live, a forged `cs_mock_` id falls through to the authenticated
  // Stripe branch (and is rejected) instead of returning a fake "complete".
  if (shouldUseMockCheckout() && isMockSessionId(sessionId)) {
    const status = getMockSessionStatus(sessionId);
    if (!status) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  // ── No Auth Guard (by design) ────────────────────────
  // This endpoint supports guest checkout: a user who just paid via Stripe
  // Checkout may not have an account (or a Firebase session) yet. The Stripe
  // Checkout session id (`cs_...`) is a cryptographically random, unguessable
  // token minted by Stripe and only known to whoever completed that specific
  // checkout — knowledge of it is itself the proof of ownership, the same
  // reasoning already applied to the mock branch above.
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Extract subscription details
    const subscription = session.subscription as Stripe.Subscription | null;

    return NextResponse.json({
      status: session.status,                      // "complete" | "expired" | "open"
      paymentStatus: session.payment_status,       // "paid" | "unpaid" | "no_payment_required"
      plan: session.metadata?.plan ?? null,
      planId: session.metadata?.planId ?? null,
      billingInterval: session.metadata?.billingInterval ?? null,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      subscriptionId: typeof session.subscription === 'string'
        ? session.subscription
        : subscription?.id ?? null,
      subscriptionStatus: subscription?.status ?? null,
      trialEnd: subscription?.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    });
  } catch (error: any) {
    console.error('[Session Status]', error);

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve session status' },
      { status: 500 }
    );
  }
}
