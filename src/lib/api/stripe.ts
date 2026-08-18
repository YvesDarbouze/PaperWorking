import { z } from 'zod';

export interface StripeSubscriptionPlan {
  planId: 'standard' | 'team' | 'vendor';
  name: string;
  priceMonthly: number;
  stripePriceId: string;
}

export const STRIPE_PLANS: Record<string, StripeSubscriptionPlan> = {
  standard: {
    planId: 'standard',
    name: 'Standard Investor',
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRICE_STANDARD || 'price_std_mock_123',
  },
  team: {
    planId: 'team',
    name: 'Team & Syndicate',
    priceMonthly: 199,
    stripePriceId: process.env.STRIPE_PRICE_TEAM || 'price_team_mock_123',
  },
  vendor: {
    planId: 'vendor',
    name: 'Vendor Network',
    priceMonthly: 0,
    stripePriceId: 'price_vendor_free',
  },
};

export interface WebhookEventPayload {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      subscription?: string;
      amount_paid?: number;
      status?: string;
    };
  };
}

/**
 * Handles incoming Stripe Webhook Events server-side
 */
export function handleStripeWebhook(event: WebhookEventPayload): {
  handled: boolean;
  actionTaken: string;
  status: string;
} {
  switch (event.type) {
    case 'invoice.paid':
      return {
        handled: true,
        actionTaken: 'grant_access',
        status: 'active',
      };
    case 'invoice.payment_failed':
      return {
        handled: true,
        actionTaken: 'grace_period_alert',
        status: 'past_due',
      };
    case 'customer.subscription.deleted':
      return {
        handled: true,
        actionTaken: 'revoke_team_features',
        status: 'canceled',
      };
    default:
      return {
        handled: false,
        actionTaken: 'ignored',
        status: 'unknown',
      };
  }
}
