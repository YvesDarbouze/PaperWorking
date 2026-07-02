import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   POST /api/stripe/subscription

   Authenticated (idToken in body). Returns the user's
   active Stripe subscription's current_period_end.

   Body:  { idToken: string }
   200:   { currentPeriodEnd: number | null }
   400:   missing idToken
   401:   invalid token
   500:   internal error
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  // Use the same API version as the rest of the app
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' as any });
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken.' }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const stripeCustomerId = userSnap.data()?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json({ currentPeriodEnd: null }, { status: 200 });
    }

    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ currentPeriodEnd: null }, { status: 200 });
    }

    return NextResponse.json({ currentPeriodEnd: (subscriptions.data[0] as any).current_period_end }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe/Subscription] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
