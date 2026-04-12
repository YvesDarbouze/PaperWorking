import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia',
});

// Mapping of generic plans to hypothetical Stripe Price IDs
const PLAN_PRICE_MAP: Record<string, string> = {
  'Individual': process.env.STRIPE_PRICE_INDIVIDUAL || 'price_123',
  'Team': process.env.STRIPE_PRICE_TEAM || 'price_456',
  'Lawyer Lead-Gen': process.env.STRIPE_PRICE_LAWYER || 'price_789',
};

export async function POST(request: Request) {
  try {
    const { plan, userId, userEmail } = await request.json();

    if (!PLAN_PRICE_MAP[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLAN_PRICE_MAP[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer_email: userEmail,
      client_reference_id: userId, // We'll use this in the webhook to know which user paid
      metadata: {
        userId,
        plan
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
