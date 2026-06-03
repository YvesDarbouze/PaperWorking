import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { enforceProjectLimitsOnDowngrade } from '@/lib/entitlements/server';

// Webhook must never be cached and may need extra time for Firestore batch writes
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';

async function sendStripeEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[Stripe Webhook] Email mocked (no RESEND_API_KEY). To: ${to}, Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[Stripe Webhook] Email sent successfully to ${to}`);
  } catch (error) {
    console.error('[Stripe Webhook] Non-fatal error sending email:', error);
  }
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
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

/**
 * Applies the 'referral-one-month-free' coupon to both referee and referrer.
 */
async function applyReferralRewards(
  refereeUid: string,
  refereeStripeCustomerId: string,
  refereeSubscriptionId: string,
  stripe: Stripe
): Promise<void> {
  const refereeDocRef = adminDb.collection('users').doc(refereeUid);
  const refereeDoc = await refereeDocRef.get();
  const refereeData = refereeDoc.data();

  if (!refereeData || refereeData.referralRewardApplied || !refereeData.referredBy) {
    return;
  }

  const referrerCode = refereeData.referredBy;
  console.log(`[Referrals] Applying rewards: Referee ${refereeUid} referred by code ${referrerCode}`);

  // 1. Find the referrer by their referralCode
  const referrerQuery = await adminDb
    .collection('users')
    .where('referralCode', '==', referrerCode)
    .limit(1)
    .get();

  if (referrerQuery.empty) {
    console.warn(`[Referrals] Referrer not found for code: ${referrerCode}`);
    return;
  }

  const referrerDoc = referrerQuery.docs[0];
  const referrerUid = referrerDoc.id;
  const referrerData = referrerDoc.data();

  // 2. Apply Coupon to Referee's active subscription
  try {
    await stripe.subscriptions.update(refereeSubscriptionId, {
      discounts: [{ coupon: 'referral-one-month-free' }],
    });
    console.log(`[Referrals] Applied coupon to Referee subscription: ${refereeSubscriptionId}`);
  } catch (err: any) {
    console.error(`[Referrals] Failed to apply coupon to Referee subscription:`, err.message);
  }

  // 3. Apply Coupon to Referrer
  if (referrerData?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.update(referrerData.stripeSubscriptionId, {
        discounts: [{ coupon: 'referral-one-month-free' }],
      });
      console.log(`[Referrals] Applied coupon to Referrer active subscription: ${referrerData.stripeSubscriptionId}`);
    } catch (err: any) {
      console.error(`[Referrals] Failed to apply coupon to Referrer subscription:`, err.message);
    }
  }

  // 4. Update Referee user document to mark reward as applied
  await refereeDocRef.update({
    referralRewardApplied: true,
    referralRewardAppliedAt: FieldValue.serverTimestamp(),
  });

  // 5. Increment Referrer count
  await adminDb.collection('users').doc(referrerUid).update({
    referralCount: FieldValue.increment(1),
  });

  console.log(`[Referrals] Successfully recorded referral reward applications.`);
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
              plan: plan || null,
              stripeCustomerId: session.customer ? (session.customer as string) : null,
              stripeSubscriptionId: session.subscription ? (session.subscription as string) : null,
              subscriptionStatus: actualStatus,
              trialEnd: trialEnd || null,
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

          // Apply referral reward if immediately active
          if (actualStatus === 'active' && session.subscription) {
            await applyReferralRewards(userId, session.customer as string, session.subscription as string, stripe);
          }

          // Send welcome/subscription created email
          const userDoc = await adminDb.collection('users').doc(userId).get();
          const email = userDoc.data()?.email;
          if (email) {
            const subject = 'Welcome to PaperWorking Pro!';
            const html = '<p>Your subscription is now active. Thank you for upgrading!</p>';
            // Non-blocking fire and forget
            sendStripeEmail(email, subject, html).catch(() => {});
          }
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

        console.log(`[Stripe Webhook] Received trial_will_end for customer: ${stripeCustomerId}`);

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
          
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const email = userDoc.data()?.email;
          if (email) {
            const subject = 'Your PaperWorking Trial is Ending Soon';
            const html = '<p>Your trial will convert to a paid plan soon. You can manage your billing in settings.</p>';
            sendStripeEmail(email, subject, html).catch(() => {});
          }
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
          
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const email = userDoc.data()?.email;
          if (email) {
            const subject = 'Your PaperWorking Subscription Renewed';
            const html = '<p>Your subscription has been successfully renewed. You can view your invoice in billing settings.</p>';
            sendStripeEmail(email, subject, html).catch(() => {});
          }
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

          // Alert the user about the failed payment
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const email = userDoc.data()?.email;
          if (email) {
            const subject = 'Action Required: Payment Failed';
            const html = '<p>We were unable to process your latest payment. Please update your payment method in billing settings to avoid service interruption.</p>';
            sendStripeEmail(email, subject, html).catch(() => {});
          }
        }
        break;
      }

      // =========================================================
      // SUBSCRIPTION DELETED — Full cancellation + graceful downgrade
      // Projects are never deleted. Excess projects beyond the
      // new plan's limit are marked readOnly (visible + exportable).
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

          // Graceful downgrade: mark excess projects as readOnly
          const { markedReadOnly } = await enforceProjectLimitsOnDowngrade(uid, 'none');
          if (markedReadOnly.length > 0) {
            console.log(
              `[Stripe Webhook] Downgrade: ${markedReadOnly.length} projects marked readOnly for user ${uid}`
            );
          }

          const userDoc = await adminDb.collection('users').doc(uid).get();
          const email = userDoc.data()?.email;
          if (email) {
            const subject = 'Your PaperWorking Subscription Has Been Canceled';
            const html = '<p>Your subscription has been canceled. You can resubscribe at any time from your billing settings.</p>';
            sendStripeEmail(email, subject, html).catch(() => {});
          }
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
            updateData.currentPeriodEnd = (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000).toISOString()
              : null;
          } else {
            updateData.cancelAtPeriodEnd = false;
          }

          await updateUserAndOrg(uid, updateData);

          // Detect trialing → active conversion (the North Star event)
          const previousStatus = (event.data.previous_attributes as any)?.status;
          if (previousStatus === 'trialing' && mappedStatus === 'active') {
            const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
            if (phKey) {
              // PostHog server-side event via REST API
              fetch('https://app.posthog.com/capture/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_key: phKey,
                  event: 'trial_converted_to_paid',
                  distinct_id: uid,
                  properties: {
                    plan: planFromMeta ?? 'unknown',
                    subscriptionId: subscription.id,
                  },
                }),
              }).catch(() => { /* non-fatal */ });
            }
          }

          // Apply referral reward when subscription transitions to active
          if (mappedStatus === 'active') {
            await applyReferralRewards(uid, stripeCustomerId, subscription.id, stripe);
          }
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
