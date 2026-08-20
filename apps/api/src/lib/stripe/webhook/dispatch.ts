import { mapStripeSubscriptionStatus } from '../status-map.js';
import type { StripeWebhookEvent } from './types.js';

export interface StripeWebhookDispatchDeps {
  retrieveSubscription?: (subscriptionId: string) => Promise<{
    status: string;
    trial_end?: number | null;
    items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string } }> };
    metadata?: Record<string, string>;
    cancel_at_period_end?: boolean;
    current_period_end?: number;
    id: string;
    customer: string;
  }>;
  resolveUidFromCustomer?: (stripeCustomerId: string) => Promise<string | null>;
  findUserIdByEmail?: (email: string) => Promise<string | null>;
  updateUserAndOrg?: (uid: string, data: Record<string, unknown>) => Promise<void>;
  storePendingSubscription?: (
    email: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  getUserEmail?: (uid: string) => Promise<string | null>;
  sendBillingEmail?: (to: string, subject: string, html: string) => Promise<void>;
  sendRawEmail?: (to: string[], subject: string, html: string) => Promise<void>;
  sendPaymentFailedEmail?: (params: {
    email: string;
    amountFormatted: string;
    attemptCount: number;
    nextAttemptDateFormatted?: string;
    updatePaymentUrl: string;
  }) => Promise<void>;
  applyReferralRewards?: (
    uid: string,
    stripeCustomerId: string,
    subscriptionId: string,
  ) => Promise<void>;
  enforceDowngrade?: (uid: string) => Promise<{ markedReadOnly: string[] }>;
  captureTrialConverted?: (
    uid: string,
    props: Record<string, unknown>,
  ) => Promise<void>;
  appUrl?: string;
}

function formatCurrency(unitAmount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(unitAmount / 100);
}

function subscriptionIdFromInvoice(invoice: Record<string, unknown>): string | null {
  const direct = invoice.subscription;
  if (typeof direct === 'string') return direct;
  const parent = invoice.parent as Record<string, unknown> | undefined;
  const details = parent?.subscription_details as Record<string, unknown> | undefined;
  const nested = details?.subscription;
  return typeof nested === 'string' ? nested : null;
}

/**
 * Processes a verified Stripe webhook event — side effects injected for wiring.
 */
export async function dispatchStripeWebhookEvent(
  event: StripeWebhookEvent,
  deps: StripeWebhookDispatchDeps = {},
): Promise<void> {
  const appUrl = deps.appUrl ?? 'https://paperworking.co';

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      let userId =
        (session.client_reference_id as string | undefined) ||
        (session.metadata as Record<string, string> | undefined)?.userId;
      const plan = (session.metadata as Record<string, string> | undefined)?.plan;

      let actualStatus = 'active';
      let trialEnd: string | null = null;
      const subscriptionId = session.subscription as string | undefined;

      if (subscriptionId && deps.retrieveSubscription) {
        try {
          const sub = await deps.retrieveSubscription(subscriptionId);
          actualStatus = mapStripeSubscriptionStatus(sub.status) || 'active';
          trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        } catch {
          // non-fatal — keep default active
        }
      }

      const customerEmail = (session.customer_details as { email?: string } | undefined)?.email;

      if ((!userId || userId === 'guest') && customerEmail && deps.findUserIdByEmail) {
        const linked = await deps.findUserIdByEmail(customerEmail);
        if (linked) {
          userId = linked;
        } else if (deps.storePendingSubscription) {
          await deps.storePendingSubscription(customerEmail, {
            plan: plan ?? null,
            stripeCustomerId: session.customer ?? null,
            stripeSubscriptionId: subscriptionId ?? null,
            subscriptionStatus: actualStatus,
            trialEnd,
            sessionId: session.id,
            customerEmail,
          });
          break;
        }
      }

      if (userId && userId !== 'guest' && plan && deps.updateUserAndOrg) {
        await deps.updateUserAndOrg(userId, {
          subscriptionPlan: plan,
          subscriptionStatus: actualStatus,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscriptionId,
          ...(trialEnd ? { trialEnd } : {}),
        });

        if (actualStatus === 'active' && subscriptionId && deps.applyReferralRewards) {
          await deps.applyReferralRewards(
            userId,
            String(session.customer),
            subscriptionId,
          );
        }

        if (deps.getUserEmail && deps.sendBillingEmail) {
          const email = await deps.getUserEmail(userId);
          if (email) {
            await deps.sendBillingEmail(
              email,
              'Welcome to PaperWorking Pro!',
              '<p>Your subscription is now active. Thank you for upgrading!</p>',
            );
          }
        }
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object;
      const stripeCustomerId = String(subscription.customer);
      const uid = deps.resolveUidFromCustomer
        ? await deps.resolveUidFromCustomer(stripeCustomerId)
        : null;

      if (uid && deps.updateUserAndOrg) {
        const trialEndTs = subscription.trial_end as number | null;
        const trialEndIso = trialEndTs ? new Date(trialEndTs * 1000).toISOString() : null;

        await deps.updateUserAndOrg(uid, {
          trialEndingSoon: true,
          trialEnd: trialEndIso,
        });

        if (deps.getUserEmail && deps.sendRawEmail) {
          const email = await deps.getUserEmail(uid);
          if (email) {
            const trialEndFmt = trialEndTs
              ? new Date(trialEndTs * 1000).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'soon';
            const items = subscription.items as
              | { data?: Array<{ price?: { unit_amount?: number; currency?: string } }> }
              | undefined;
            const unitAmount = items?.data?.[0]?.price?.unit_amount ?? 0;
            const currency = items?.data?.[0]?.price?.currency ?? 'usd';
            const amountFmt = formatCurrency(unitAmount, currency);

            await deps.sendRawEmail(
              [email],
              `Your PaperWorking Trial Ends ${trialEndFmt}`,
              `<p>Your 14-day free trial ends on <strong>${trialEndFmt}</strong>.</p>
              <p>On that date your card on file will be charged <strong>${amountFmt}</strong>.</p>
              <p><a href="${appUrl}/dashboard/settings/billing">billing settings</a></p>`,
            );
          }
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_create') break;

      const invoiceSubId = subscriptionIdFromInvoice(invoice);
      if (
        invoice.billing_reason === 'subscription_cycle' &&
        invoiceSubId &&
        deps.retrieveSubscription
      ) {
        try {
          const sub = await deps.retrieveSubscription(invoiceSubId);
          const trialEndedRecently =
            sub.trial_end != null && Date.now() / 1000 - sub.trial_end < 86_400;
          if (trialEndedRecently) break;
        } catch {
          // continue with renewal email
        }
      }

      const uid = deps.resolveUidFromCustomer
        ? await deps.resolveUidFromCustomer(String(invoice.customer))
        : null;

      if (uid) {
        if (deps.updateUserAndOrg) {
          await deps.updateUserAndOrg(uid, { subscriptionStatus: 'active' });
        }
        if (deps.getUserEmail && deps.sendBillingEmail) {
          const email = await deps.getUserEmail(uid);
          if (email) {
            await deps.sendBillingEmail(
              email,
              'Your PaperWorking Subscription Renewed',
              '<p>Your subscription has been successfully renewed.</p>',
            );
          }
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const uid = deps.resolveUidFromCustomer
        ? await deps.resolveUidFromCustomer(String(invoice.customer))
        : null;

      if (uid && deps.updateUserAndOrg) {
        await deps.updateUserAndOrg(uid, { subscriptionStatus: 'past_due' });

        if (deps.getUserEmail && deps.sendPaymentFailedEmail) {
          const email = await deps.getUserEmail(uid);
          if (email) {
            const nextAttempt = invoice.next_payment_attempt as number | undefined;
            await deps.sendPaymentFailedEmail({
              email,
              amountFormatted: `$${(((invoice.amount_due as number) || 0) / 100).toFixed(2)}`,
              attemptCount: (invoice.attempt_count as number) || 1,
              nextAttemptDateFormatted: nextAttempt
                ? new Date(nextAttempt * 1000).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : undefined,
              updatePaymentUrl: `${appUrl}/dashboard/settings/billing`,
            });
          }
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const uid = deps.resolveUidFromCustomer
        ? await deps.resolveUidFromCustomer(String(subscription.customer))
        : null;

      if (uid && deps.updateUserAndOrg) {
        await deps.updateUserAndOrg(uid, {
          subscriptionStatus: 'canceled',
          subscriptionPlan: 'None',
          stripeSubscriptionId: null,
        });

        if (deps.enforceDowngrade) {
          await deps.enforceDowngrade(uid);
        }

        if (deps.getUserEmail && deps.sendBillingEmail) {
          const email = await deps.getUserEmail(uid);
          if (email) {
            await deps.sendBillingEmail(
              email,
              'Your PaperWorking Subscription Has Been Canceled',
              '<p>Your subscription has been canceled.</p>',
            );
          }
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const uid = deps.resolveUidFromCustomer
        ? await deps.resolveUidFromCustomer(String(subscription.customer))
        : null;

      if (uid && deps.updateUserAndOrg) {
        const mappedStatus = mapStripeSubscriptionStatus(String(subscription.status));
        const metadata = subscription.metadata as Record<string, string> | undefined;
        const planFromMeta = metadata?.plan;

        const updateData: Record<string, unknown> = {
          subscriptionStatus: mappedStatus,
          stripeSubscriptionId: subscription.id,
        };
        if (planFromMeta) updateData.subscriptionPlan = planFromMeta;

        if (subscription.cancel_at_period_end) {
          updateData.cancelAtPeriodEnd = true;
          updateData.currentPeriodEnd = subscription.current_period_end
            ? new Date((subscription.current_period_end as number) * 1000).toISOString()
            : null;
        } else {
          updateData.cancelAtPeriodEnd = false;
        }

        await deps.updateUserAndOrg(uid, updateData);

        const previousStatus = event.data.previous_attributes?.status;
        if (previousStatus === 'trialing' && mappedStatus === 'active') {
          await deps.updateUserAndOrg(uid, { trialConvertedAt: new Date().toISOString() });

          if (deps.getUserEmail && deps.sendBillingEmail) {
            const email = await deps.getUserEmail(uid);
            if (email) {
              const items = subscription.items as
                | { data?: Array<{ price?: { unit_amount?: number; currency?: string } }> }
                | undefined;
              const unitAmount = items?.data?.[0]?.price?.unit_amount ?? 0;
              const currency = items?.data?.[0]?.price?.currency ?? 'usd';
              const amountFmt = formatCurrency(unitAmount, currency);

              await deps.sendBillingEmail(
                email,
                "Your PaperWorking Trial Has Ended — You've Been Charged",
                `<p>Your card has been charged <strong>${amountFmt}</strong>.</p>`,
              );
            }
          }

          if (deps.captureTrialConverted) {
            await deps.captureTrialConverted(uid, {
              plan: planFromMeta ?? 'unknown',
              subscriptionId: subscription.id,
            });
          }
        }

        if (mappedStatus === 'active' && deps.applyReferralRewards) {
          await deps.applyReferralRewards(
            uid,
            String(subscription.customer),
            String(subscription.id),
          );
        }
      }
      break;
    }

    default:
      break;
  }
}
