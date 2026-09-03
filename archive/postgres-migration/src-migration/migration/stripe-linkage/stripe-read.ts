import type Stripe from 'stripe';
import type { StripeCustomerSnapshot, StripeSubscriptionSnapshot } from './types.js';
import { extractUidFromMetadata } from './resolve-identity.js';

function metadataToRecord(
  metadata: Stripe.Metadata | null | undefined,
): Record<string, string> {
  if (!metadata) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

function customerSnapshot(customer: Stripe.Customer): StripeCustomerSnapshot {
  return {
    id: customer.id,
    email: typeof customer.email === 'string' ? customer.email : null,
    metadata: metadataToRecord(customer.metadata),
  };
}

function subscriptionSnapshot(sub: Stripe.Subscription): StripeSubscriptionSnapshot {
  const customer =
    typeof sub.customer === 'string'
      ? { id: sub.customer, email: null, metadata: {} }
      : customerSnapshot(sub.customer as Stripe.Customer);

  const priceId =
    sub.items?.data?.[0]?.price?.id && typeof sub.items.data[0].price.id === 'string'
      ? sub.items.data[0].price.id
      : null;

  return {
    id: sub.id,
    customerId: customer.id,
    status: sub.status,
    priceId,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    currentPeriodStart: sub.current_period_start ?? null,
    currentPeriodEnd: sub.current_period_end ?? null,
    trialEnd: sub.trial_end ?? null,
    metadata: metadataToRecord(sub.metadata),
    customer:
      typeof sub.customer === 'string'
        ? customer
        : customerSnapshot(sub.customer as Stripe.Customer),
  };
}

export async function listLiveStripeBillingObjects(
  secretKey: string,
): Promise<{ customers: StripeCustomerSnapshot[]; subscriptions: StripeSubscriptionSnapshot[] }> {
  const StripeSdk = (await import('stripe')).default;
  const stripe = new StripeSdk(secretKey);

  const customers: StripeCustomerSnapshot[] = [];
  for await (const customer of stripe.customers.list({ limit: 100 })) {
    customers.push(customerSnapshot(customer));
  }

  const subscriptions: StripeSubscriptionSnapshot[] = [];
  for await (const sub of stripe.subscriptions.list({
    limit: 100,
    status: 'all',
    expand: ['data.customer'],
  })) {
    subscriptions.push(subscriptionSnapshot(sub));
  }

  return { customers, subscriptions };
}

export function discoveryMetadataUid(
  subscription: StripeSubscriptionSnapshot,
): string | null {
  return (
    extractUidFromMetadata(subscription.metadata) ??
    extractUidFromMetadata(subscription.customer.metadata)
  );
}
