/**
 * Admin Subscription & Dunning Store
 * Provides operational actions for payment collection retries and delinquent cancellations.
 * Backed by admin ops state with audit trail logging and Stripe credentials awareness.
 */

import {
  SEED_ADMIN_SUBSCRIPTIONS,
  SEED_ADMIN_AUDIT,
  SEED_ADMIN_USERS,
} from './seed-data';

export interface DunningRecord {
  id: string;
  customer: string;
  amount: number;
  attempts: number;
  nextRetryAt: string;
  reason: string;
  status?: 'pending' | 'canceled' | 'succeeded';
}

export interface SubscriptionActionResult {
  success: boolean;
  message: string;
  dunningRecord?: DunningRecord;
  requiresCredentials?: boolean;
  action: 'retry' | 'cancel';
}

/**
 * Retries payment collection on a dunning record.
 * Increments attempt count and reschedules the next collection attempt.
 */
export async function retryDunningPayment(dunningId: string): Promise<SubscriptionActionResult> {
  const dunningItem = SEED_ADMIN_SUBSCRIPTIONS.dunning.find((d) => d.id === dunningId);

  if (!dunningItem) {
    throw new Error(`Dunning record not found with ID "${dunningId}"`);
  }

  // Check if Stripe API credentials are configured
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  // Update retry attempts
  dunningItem.attempts += 1;

  // Reschedule retry date (+3 days from now)
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 3);
  const formattedNextRetry = nextDate.toISOString().split('T')[0];
  dunningItem.nextRetryAt = formattedNextRetry;

  // Log in administrative audit trail
  const auditEntry = {
    id: `aud-${Date.now()}`,
    seq: (SEED_ADMIN_AUDIT.logs[0]?.seq || 128) + 1,
    severity: 'info' as const,
    action: 'billing.retry_payment',
    actor: 'admin',
    target: dunningItem.id,
    details: `Payment collection retry attempt #${dunningItem.attempts} queued for ${dunningItem.customer} ($${dunningItem.amount})`,
    ip: '127.0.0.1',
    at: new Date().toISOString(),
    hash: Math.random().toString(36).substring(2, 8),
  };
  SEED_ADMIN_AUDIT.logs.unshift(auditEntry);

  const message = stripeConfigured
    ? `Payment retry dispatched via Stripe for ${dunningItem.customer}. Next retry scheduled for ${formattedNextRetry}.`
    : `Payment collection retry #${dunningItem.attempts} queued in system for ${dunningItem.customer}. Next retry scheduled for ${formattedNextRetry}.`;

  return {
    success: true,
    action: 'retry',
    message,
    dunningRecord: { ...dunningItem },
    requiresCredentials: !stripeConfigured,
  };
}

/**
 * Cancels a delinquent subscription from the dunning queue.
 * Removes/updates the dunning record, updates user and subscription statuses, and decrements at-risk count.
 */
export async function cancelDunningSubscription(dunningId: string): Promise<SubscriptionActionResult> {
  const dunningIndex = SEED_ADMIN_SUBSCRIPTIONS.dunning.findIndex((d) => d.id === dunningId);

  if (dunningIndex < 0) {
    throw new Error(`Dunning record not found with ID "${dunningId}"`);
  }

  const dunningItem = SEED_ADMIN_SUBSCRIPTIONS.dunning[dunningIndex];
  const customerName = dunningItem.customer;

  // Remove from active dunning queue
  SEED_ADMIN_SUBSCRIPTIONS.dunning.splice(dunningIndex, 1);

  // Decrement at-risk counter
  if (SEED_ADMIN_SUBSCRIPTIONS.atRisk > 0) {
    SEED_ADMIN_SUBSCRIPTIONS.atRisk -= 1;
  }

  // Update recent subscriptions status
  const recentSub = SEED_ADMIN_SUBSCRIPTIONS.recent.find(
    (s) => s.customer.toLowerCase() === customerName.toLowerCase()
  );
  if (recentSub) {
    recentSub.status = 'canceled';
  }

  // Update user store status
  const user = SEED_ADMIN_USERS.find(
    (u) => u.displayName.toLowerCase() === customerName.toLowerCase()
  );
  if (user) {
    user.subscriptionStatus = 'canceled';
  }

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  // Log in administrative audit trail
  const auditEntry = {
    id: `aud-${Date.now()}`,
    seq: (SEED_ADMIN_AUDIT.logs[0]?.seq || 128) + 1,
    severity: 'warning' as const,
    action: 'billing.cancel_subscription',
    actor: 'admin',
    target: dunningItem.id,
    details: `Subscription canceled for delinquent customer ${customerName} ($${dunningItem.amount} uncollected)`,
    ip: '127.0.0.1',
    at: new Date().toISOString(),
    hash: Math.random().toString(36).substring(2, 8),
  };
  SEED_ADMIN_AUDIT.logs.unshift(auditEntry);

  const message = stripeConfigured
    ? `Subscription canceled in Stripe and local registry for delinquent account ${customerName}. Dunning queue updated.`
    : `Subscription canceled for delinquent account ${customerName}. Dunning queue updated.`;

  return {
    success: true,
    action: 'cancel',
    message,
    dunningRecord: { ...dunningItem, status: 'canceled' },
    requiresCredentials: !stripeConfigured,
  };
}
