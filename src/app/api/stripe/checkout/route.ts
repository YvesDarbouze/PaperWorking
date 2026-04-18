import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebase/admin';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

// Map plan + interval → Stripe Price ID env var
const PRICE_MAP: Record<string, { monthly: string; annual: string }> = {
  'Individual': {
    monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || process.env.STRIPE_PRICE_INDIVIDUAL || '',
    annual:  process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL  || '',
  },
  'Investor Team': {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || process.env.STRIPE_PRICE_TEAM || '',
    annual:  process.env.STRIPE_PRICE_TEAM_ANNUAL  || '',
  },
  'Team': {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || process.env.STRIPE_PRICE_TEAM || '',
    annual:  process.env.STRIPE_PRICE_TEAM_ANNUAL  || '',
  },
  'Lawyer': {
    monthly: process.env.STRIPE_PRICE_LAWYER_MONTHLY || process.env.STRIPE_PRICE_LAWYER || '',
    annual:  process.env.STRIPE_PRICE_LAWYER_ANNUAL  || '',
  },
};

// Canonical plan names stored in Firestore metadata
const CANONICAL_PLAN: Record<string, string> = {
  'Individual':    'Individual',
  'Investor Team': 'Team',
  'Team':          'Team',
  'Lawyer':        'Lawyer Lead-Gen',
};

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const { plan, billingInterval = 'monthly', userId, userEmail, idToken } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Verify the caller owns the account they're subscribing
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (decoded.uid !== userId) {
          return NextResponse.json({ error: 'Token / user mismatch.' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 });
      }
    }

    const interval: 'monthly' | 'annual' = billingInterval === 'annual' ? 'annual' : 'monthly';
    const priceId = PRICE_MAP[plan]?.[interval];

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe Price ID configured for "${plan}" (${interval}). Set the env var.` },
        { status: 400 }
      );
    }

    const canonicalPlan = CANONICAL_PLAN[plan] ?? plan;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing?canceled=true`,
      customer_email: userEmail ?? undefined,
      client_reference_id: userId,
      metadata: { userId, plan: canonicalPlan, billingInterval: interval },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
