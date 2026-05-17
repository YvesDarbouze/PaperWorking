import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Webhook must never be cached and may need extra time for Firestore batch writes
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/* ═══════════════════════════════════════════════════════
   Stripe → Firestore Status Mapping

   Covers all Stripe subscription statuses:
   https://docs.stripe.com/api/subscriptions/object#subscription_object-status
   ═══════════════════════════════════════════════════════ */
const STRIPE_STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  paused: 'paused',
};

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

/**
 * Idempotency guard: checks if we've already processed this event.
 * Uses Firestore `stripe_events` collection as a dedup log.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const doc = await adminDb.collection('stripe_events').doc(eventId).get();
  return doc.exists;
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await adminDb.collection('stripe_events').doc(eventId).set({
    eventType,
    processedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Batch-updates user and (optionally) organization documents.
 */
async function updateUserAndOrg(
  uid: string,
  userData: Record<string, any>
): Promise<void> {
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const organizationId = userDoc.data()?.organizationId;

  const batch = adminDb.batch();
  batch.update(adminDb.collection('users').doc(uid), {
    ...userData,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (organizationId) {
    // Only propagate subscription-related fields to org
    const orgData: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
    if ('subscriptionPlan' in userData) orgData.subscriptionPlan = userData.subscriptionPlan;
    if ('subscriptionStatus' in userData) orgData.subscriptionStatus = userData.subscriptionStatus;
    batch.update(adminDb.collection('organizations').doc(organizationId), orgData);
  }

  await batch.commit();
}

/* ═══════════════════════════════════════════════════════
   POST /api/stripe/webhook
   ═══════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;
  const stripe = getStripe();

  // ── Signature Verification ─────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret as string);
  } catch (err: any) {
    console.error('Stripe Webhook Signature Verification Failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // ── Idempotency Check ──────────────────────────────────
  if (await isEventProcessed(event.id)) {
    console.log(`[Stripe Webhook] Skipping already-processed event: ${event.id}`);
    return NextResponse.json({ received: true, deduplicated: true });
  }

  try {
    switch (event.type) {
      // =========================================================
      // CHECKOUT COMPLETE — Initial subscription activation
      // =========================================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId = session.client_reference_id || session.metadata?.userId;
        const plan = session.metadata?.plan;

        // Fetch the real subscription status (may be 'trialing', not 'active')
        let actualStatus = 'active';
        let trialEnd: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            actualStatus = STRIPE_STATUS_MAP[sub.status] || 'active';
            trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
          } catch (e) {
            console.warn('[Stripe Webhook] Could not retrieve subscription for trial status check:', e);
          }
        }

        // ── Guest Checkout Linking ──
        // If userId is missing or 'guest', attempt to find the user by email.
        // This handles the flow where a user checks out before registering.
        if ((!userId || userId === 'guest') && session.customer_details?.email) {
          const emailLookup = await adminDb
            .collection('users')
            .where('email', '==', session.customer_details.email)
            .limit(1)
            .get();

          if (!emailLookup.empty) {
            userId = emailLookup.docs[0].id;
            console.log(`[Stripe Webhook] Linked guest checkout to existing user: ${userId}`);
          } else {
            // No user found — store the session for later linking when user signs in
            console.log(`[Stripe Webhook] Guest checkout for ${session.customer_details.email} — will link on sign-in`);
            await adminDb.collection('pending_subscriptions').doc(session.customer_details.email).set({
              plan,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: actualStatus,
              trialEnd,
              sessionId: session.id,
              customerEmail: session.customer_details.email,
              createdAt: FieldValue.serverTimestamp(),
            });
            break;
          }
        }

        if (userId && userId !== 'guest' && plan) {
          await updateUserAndOrg(userId, {
            subscriptionPlan: plan,
            subscriptionStatus: actualStatus,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            ...(trialEnd ? { trialEnd } : {}),
          });
        }
        break;
      }

      // =========================================================
      // TRIAL ENDING SOON — 3 days before trial converts to paid
      // Stripe fires this automatically; log it for email triggers.
      // =========================================================
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          const trialEndDate = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null;
          await updateUserAndOrg(uid, {
            trialEndingSoon: true,
            trialEnd: trialEndDate,
          });
          console.log(`[Stripe Webhook] Trial ending soon for user ${uid}, trial_end: ${trialEndDate}`);
          // TODO: trigger transactional email via your email provider here
        }
        break;
      }

      // =========================================================
      // INVOICE PAID — Renewal confirmation (skip initial create)
      // =========================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;

        // Skip the initial subscription creation invoice — already handled above
        if (invoice.billing_reason === 'subscription_create') break;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          await updateUserAndOrg(uid, {
            subscriptionStatus: 'active',
          });
        }
        break;
      }

      // =========================================================
      // INVOICE PAYMENT FAILED — Flag the account
      // =========================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          await updateUserAndOrg(uid, {
            subscriptionStatus: 'past_due',
          });
        }
        break;
      }

      // =========================================================
      // SUBSCRIPTION DELETED — Full cancellation
      // =========================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          await updateUserAndOrg(uid, {
            subscriptionStatus: 'canceled',
            subscriptionPlan: 'None',
            stripeSubscriptionId: null,
          });
        }
        break;
      }

      // =========================================================
      // SUBSCRIPTION UPDATED — Status changes, plan upgrades/downgrades
      // =========================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const uid = await resolveUidFromStripeCustomer(stripeCustomerId);
        if (uid) {
          const mappedStatus = STRIPE_STATUS_MAP[subscription.status] || 'inactive';

          const updateData: Record<string, any> = {
            subscriptionStatus: mappedStatus,
            stripeSubscriptionId: subscription.id,
          };

          // If the subscription has plan metadata, sync it
          const planFromMeta = subscription.metadata?.plan;
          if (planFromMeta) {
            updateData.subscriptionPlan = planFromMeta;
          }

          // Track cancellation scheduling
          if (subscription.cancel_at_period_end) {
            updateData.cancelAtPeriodEnd = true;
            updateData.currentPeriodEnd = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null;
          } else {
            updateData.cancelAtPeriodEnd = false;
          }

          await updateUserAndOrg(uid, updateData);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // ── Mark event as processed (after successful handling) ──
    await markEventProcessed(event.id, event.type);
  } catch (processingError: any) {
    console.error('[Stripe Webhook] Processing error:', processingError);
    // Return 500 so Stripe retries the event — do NOT swallow errors
    return NextResponse.json(
      { error: `Processing failed: ${processingError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
