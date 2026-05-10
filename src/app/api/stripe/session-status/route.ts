import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
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
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id query parameter' },
      { status: 400 }
    );
  }

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
