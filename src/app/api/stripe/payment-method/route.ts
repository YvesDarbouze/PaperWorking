import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════
   POST /api/stripe/payment-method

   Authenticated (idToken in body). Returns the user's
   default payment method details from Stripe.

   Body:  { idToken: string }
   200:   { brand, last4, expMonth, expYear, funding } | { paymentMethod: null }
   400:   missing idToken
   401:   invalid token
   500:   internal error
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
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
      return NextResponse.json({ paymentMethod: null }, { status: 200 });
    }

    const stripe = getStripe();

    // Retrieve customer with default payment method expanded
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    if ((customer as any).deleted) {
      return NextResponse.json({ paymentMethod: null }, { status: 200 });
    }

    const cust = customer as Stripe.Customer;
    const defaultPM = cust.invoice_settings?.default_payment_method;

    // If the default PM is already expanded as an object, use it directly.
    // Otherwise, try to retrieve it by ID.
    let pm: Stripe.PaymentMethod | null = null;

    if (defaultPM && typeof defaultPM === 'object') {
      pm = defaultPM as Stripe.PaymentMethod;
    } else if (typeof defaultPM === 'string') {
      pm = await stripe.paymentMethods.retrieve(defaultPM);
    }

    // Fallback: list payment methods attached to the customer
    if (!pm) {
      const methods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
        limit: 1,
      });
      if (methods.data.length > 0) {
        pm = methods.data[0];
      }
    }

    if (!pm || !pm.card) {
      return NextResponse.json({ paymentMethod: null }, { status: 200 });
    }

    return NextResponse.json({
      paymentMethod: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        funding: pm.card.funding,
      },
    }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe/PaymentMethod] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
