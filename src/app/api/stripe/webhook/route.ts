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
          const userDoc = await adminDb.collection('users').doc(userId).get();
          const organizationId = userDoc.data()?.organizationId;

          const batch = adminDb.batch();
          batch.update(adminDb.collection('users').doc(userId), {
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
            stripeCustomerId: session.customer as string,
            updatedAt: FieldValue.serverTimestamp(),
          });

          if (organizationId) {
            batch.update(adminDb.collection('organizations').doc(organizationId), {
              subscriptionPlan: plan,
              subscriptionStatus: 'active',
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;
        if (invoice.billing_reason === 'subscription_create') break;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const organizationId = userDoc.data()?.organizationId;

          const batch = adminDb.batch();
          batch.update(adminDb.collection('users').doc(uid), {
            subscriptionStatus: 'active',
            updatedAt: FieldValue.serverTimestamp(),
          });

          if (organizationId) {
            batch.update(adminDb.collection('organizations').doc(organizationId), {
              subscriptionStatus: 'active',
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const organizationId = userDoc.data()?.organizationId;

          const batch = adminDb.batch();
          batch.update(adminDb.collection('users').doc(uid), {
            subscriptionStatus: 'canceled',
            subscriptionPlan: 'None',
            updatedAt: FieldValue.serverTimestamp(),
          });

          if (organizationId) {
            batch.update(adminDb.collection('organizations').doc(organizationId), {
              subscriptionStatus: 'canceled',
              subscriptionPlan: 'None',
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const organizationId = userDoc.data()?.organizationId;

          const statusMap: Record<string, string> = {
            active: 'active',
            past_due: 'past_due',
            canceled: 'canceled',
            unpaid: 'canceled',
          };
          const mappedStatus = statusMap[subscription.status] || 'inactive';

          const batch = adminDb.batch();
          batch.update(adminDb.collection('users').doc(uid), {
            subscriptionStatus: mappedStatus,
            updatedAt: FieldValue.serverTimestamp(),
          });

          if (organizationId) {
            batch.update(adminDb.collection('organizations').doc(organizationId), {
              subscriptionStatus: mappedStatus,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
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
