/**
 * Stripe Test Mode Teardown & Customer Cleanup Utility
 * 
 * Cancels active test subscriptions and deletes test customer records created
 * by the Persona Swarm harness. Idempotent and safe-guarded for test mode only.
 */

import Stripe from 'stripe';
import { assertStripeTestMode } from '../bootstrap';
import { errorMessage } from '../types';

export interface StripeCleanupResult {
  canceledSubscriptions: number;
  deletedCustomers: number;
  errors: string[];
}

/**
 * Cancels subscriptions and deletes customers created during swarm runs.
 */
export async function cleanupStripeTestCustomers(
  customerIds: string[],
  stripeSecretKey?: string
): Promise<StripeCleanupResult> {
  const sk = stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
  assertStripeTestMode(sk);

  const stripe = new Stripe(sk);

  const result: StripeCleanupResult = {
    canceledSubscriptions: 0,
    deletedCustomers: 0,
    errors: [],
  };

  for (const customerId of customerIds) {
    if (!customerId || !customerId.startsWith('cus_')) continue;

    try {
      // 1. List and cancel active subscriptions for customer
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
      for (const sub of subs.data) {
        if (sub.status !== 'canceled') {
          await stripe.subscriptions.cancel(sub.id);
          result.canceledSubscriptions++;
        }
      }

      // 2. Delete test customer
      await stripe.customers.del(customerId);
      result.deletedCustomers++;
    } catch (err: unknown) {
      result.errors.push(`Customer ${customerId}: ${errorMessage(err)}`);
    }
  }

  return result;
}
