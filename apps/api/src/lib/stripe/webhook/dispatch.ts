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

function renderBillingEmailShell(title: string, bodyContent: string, actionUrl?: string, actionLabel?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px 12px; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f4f4f5;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #121215; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden;">
    <tr>
      <td style="padding: 20px 28px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background-color: #141418;">
        <a href="https://paperworking.co" target="_blank" style="text-decoration: none; display: inline-block;">
          <img src="https://paperworking.co/brand/logo-light.png" alt="PaperWorking" width="150" height="24" style="display: block; width: 150px; height: auto; border: 0;" />
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px; font-size: 15px; line-height: 1.6; color: #f4f4f5;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #f4f4f5;">${title}</h2>
        ${bodyContent}
        ${actionUrl && actionLabel ? `
        <div style="margin-top: 24px;">
          <a href="${actionUrl}" target="_blank" style="background-color: #f4f4f5; color: #09090b; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 13px; text-decoration: none; display: inline-block;">
            ${actionLabel}
          </a>
        </div>` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 28px; background-color: #0d0d10; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #71717a;">
        PaperWorking &bull; Institutional real estate investment management &bull; <a href="https://paperworking.co/privacy" style="color: #71717a; text-decoration: underline;">Privacy</a>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
              'Welcome to PaperWorking Pro',
              renderBillingEmailShell(
                'Welcome to PaperWorking Pro',
                '<p style="margin: 0 0 16px 0; color: #d4d4d8;">Your subscription is now active. You have full access to institutional underwriting models, portfolio metrics, and the REIL deal room.</p>',
                `${appUrl}/dashboard`,
                'Go to Dashboard',
              ),
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
              renderBillingEmailShell(
                'Your PaperWorking Trial is Ending Soon',
                `<p style="margin: 0 0 12px 0; color: #d4d4d8;">Your 14-day free trial ends on <strong style="color: #f4f4f5;">${trialEndFmt}</strong>.</p>
                <p style="margin: 0 0 16px 0; color: #d4d4d8;">On that date your card on file will be charged <strong style="color: #f4f4f5;">${amountFmt}</strong>.</p>`,
                `${appUrl}/dashboard/settings/billing`,
                'Billing Settings',
              ),
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
              renderBillingEmailShell(
                'Subscription Renewed',
                '<p style="margin: 0; color: #d4d4d8;">Your subscription has been successfully renewed. Your receipt and invoice history are available in your billing settings.</p>',
                `${appUrl}/dashboard/settings/billing`,
                'View Billing History',
              ),
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
              renderBillingEmailShell(
                'Subscription Canceled',
                '<p style="margin: 0; color: #d4d4d8;">Your subscription has been canceled. Your account has been shifted to the free tier, and your saved project records remain safely archived.</p>',
                `${appUrl}/dashboard/settings/billing`,
                'Review Account',
              ),
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
                "Your PaperWorking Trial Has Ended: Account Active",
                renderBillingEmailShell(
                  'Trial Converted to Subscription',
                  `<p style="margin: 0; color: #d4d4d8;">Your 14-day trial has concluded, and your card on file was charged <strong style="color: #f4f4f5;">${amountFmt}</strong> for your ongoing subscription plan.</p>`,
                  `${appUrl}/dashboard/settings/billing`,
                  'Manage Subscription',
                ),
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
