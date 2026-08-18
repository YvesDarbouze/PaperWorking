'use server';

import { cookies } from 'next/headers';
import { authorize } from '@/lib/authz/authorize';
import { logAdminAudit } from '@/lib/audit/auditLogger';
import { getAdminStripeClient } from '@/lib/stripe/adminStripeClient';
import { adminDb } from '@/lib/firebase/admin';

export interface DunningEntry {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  planName: string;
  status: string;
  gracePeriodActive: boolean; // past_due = grace active (access kept)
  accessRevoked: boolean; // unpaid / canceled = access revoked
  amountDue: number;
  lastFailedAt: string;
  invoiceId: string | null;
  attemptCount: number;
}

async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('__session')?.value || null;
  } catch {
    return null;
  }
}

/**
 * Server action to fetch the Dunning & At-Risk Queue (Amendment D & research dim07).
 * Identifies accounts in past_due (grace active) vs unpaid (access revoked).
 */
export async function getDunningQueue(): Promise<DunningEntry[]> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_subscriptions');
  if (!authz.authorized) return [];

  try {
    const usersSnap = await adminDb.collection('users').get();
    if (usersSnap.empty) return [];

    const dunningList: DunningEntry[] = [];
    const stripe = getAdminStripeClient();

    for (const doc of usersSnap.docs) {
      const d = doc.data();
      const status = d.subscriptionStatus || '';

      if (['past_due', 'unpaid', 'canceled'].includes(status)) {
        const stripeCustomerId = d.stripeCustomerId || null;
        let invoiceId: string | null = null;
        let amountDue = 0;
        let attemptCount = 1;
        let lastFailedAt = d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString();
        let subscriptionId: string | null = d.stripeSubscriptionId || null;

        // Try to query Stripe invoice details via Restricted Client
        if (stripe && stripeCustomerId) {
          try {
            const invoices = await stripe.invoices.list({
              customer: stripeCustomerId,
              status: 'open',
              limit: 1,
            });

            if (invoices.data.length > 0) {
              const inv = invoices.data[0];
              invoiceId = inv.id;
              amountDue = (inv.amount_due || 0) / 100;
              attemptCount = inv.attempt_count || 1;
              if (inv.created) lastFailedAt = new Date(inv.created * 1000).toISOString();
              if ((inv as unknown as Record<string, unknown>).subscription) subscriptionId = String((inv as unknown as Record<string, unknown>).subscription);
            }
          } catch {
            // Stripe API query fallback
          }
        }

        const gracePeriodActive = status === 'past_due';
        const accessRevoked = status === 'unpaid' || status === 'canceled';

        dunningList.push({
          userId: doc.id,
          userDisplayName: d.displayName || d.name || d.email?.split('@')[0] || 'Unknown User',
          userEmail: d.email || '',
          stripeCustomerId,
          subscriptionId,
          planName: d.subscriptionPlan || 'Individual',
          status,
          gracePeriodActive,
          accessRevoked,
          amountDue,
          lastFailedAt,
          invoiceId,
          attemptCount,
        });
      }
    }

    return dunningList;
  } catch (error) {
    console.error('[getDunningQueue] Failed:', error);
    return [];
  }
}

/**
 * Server action to re-attempt collection on a past-due invoice via Restricted Client (Amendment C).
 */
export async function retryFailedInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_subscriptions');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  const stripe = getAdminStripeClient();
  if (!stripe) {
    return { success: false, error: 'Stripe restricted client unconfigured.' };
  }

  try {
    const paidInvoice = await stripe.invoices.pay(invoiceId);
    const isPaid = paidInvoice.status === 'paid';

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'admin:retry_failed_invoice',
      targetResource: 'stripe_invoices',
      targetResourceId: invoiceId,
      status: isPaid ? 'SUCCESS' : 'DENIED',
      severity: 'info',
      metadata: {
        invoiceId,
        amountPaid: (paidInvoice.amount_paid || 0) / 100,
        status: paidInvoice.status,
      },
    });

    return { success: isPaid };
  } catch (error: unknown) {
    console.error('[retryFailedInvoice] Error:', error);
    return { success: false, error: (error as Error)?.message || 'Invoice payment retry failed.' };
  }
}

/**
 * Server action to cancel a user subscription (immediate or end-of-period).
 */
export async function cancelUserSubscriptionAdmin(params: {
  targetUid: string;
  subscriptionId?: string;
  immediate?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_subscriptions');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  const stripe = getAdminStripeClient();

  try {
    if (stripe && params.subscriptionId) {
      if (params.immediate) {
        await stripe.subscriptions.cancel(params.subscriptionId);
      } else {
        await stripe.subscriptions.update(params.subscriptionId, { cancel_at_period_end: true });
      }
    }

    // Update Firestore status
    await adminDb.collection('users').doc(params.targetUid).set({
      subscriptionStatus: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: 'admin:cancel_subscription',
      targetResource: 'users',
      targetResourceId: params.targetUid,
      status: 'SUCCESS',
      severity: 'warning',
      metadata: {
        subscriptionId: params.subscriptionId || null,
        immediate: params.immediate || false,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('[cancelUserSubscriptionAdmin] Error:', error);
    return { success: false, error: (error as Error)?.message || 'Cancellation failed.' };
  }
}
