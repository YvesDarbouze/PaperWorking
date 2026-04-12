import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Resolves a Firebase UID from a Stripe Customer ID.
 * Queries the users collection for a document where stripeCustomerId matches.
 */
async function resolveUidFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  const snap = await adminDb
    .collection('users')
    .where('stripeCustomerId', '==', stripeCustomerId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret as string);
  } catch (err: any) {
    console.error('Stripe Webhook Signature Verification Failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // =========================================================
      // CHECKOUT COMPLETE — Initial subscription activation
      // =========================================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.client_reference_id || session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await adminDb.collection('users').doc(userId).update({
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
            stripeCustomerId: session.customer as string,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      // =========================================================
      // INVOICE PAID — Recurring billing success (renewals)
      // =========================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;

        // Skip the very first invoice (already handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') break;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          await adminDb.collection('users').doc(uid).update({
            subscriptionStatus: 'active',
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[Stripe Webhook] Renewed subscription for user ${uid}`);
        } else {
          console.warn(`[Stripe Webhook] No user found for Stripe customer ${stripeCustomerId}`);
        }
        break;
      }

      // =========================================================
      // SUBSCRIPTION DELETED — Revoke SaaS access immediately
      // =========================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          await adminDb.collection('users').doc(uid).update({
            subscriptionStatus: 'canceled',
            subscriptionPlan: 'None',
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[Stripe Webhook] Revoked access for user ${uid}`);
        } else {
          console.warn(`[Stripe Webhook] No user found for Stripe customer ${stripeCustomerId}`);
        }
        break;
      }

      // =========================================================
      // SUBSCRIPTION UPDATED — Handle downgrades / payment failures
      // =========================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          const statusMap: Record<string, string> = {
            active: 'active',
            past_due: 'past_due',
            canceled: 'canceled',
            unpaid: 'canceled',
          };
          const mappedStatus = statusMap[subscription.status] || 'inactive';

          await adminDb.collection('users').doc(uid).update({
            subscriptionStatus: mappedStatus,
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[Stripe Webhook] Updated subscription status to '${mappedStatus}' for user ${uid}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (processingError: any) {
    console.error('[Stripe Webhook] Processing error:', processingError);
    // Return 200 to prevent Stripe retry storms — log the error for internal debugging
    return NextResponse.json({ received: true, error: processingError.message }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}
