import type { BillingProviderPort } from './billing-provider-port.js';
import { BillingValidationError } from './billing-errors.js';
import type { BillingSubscriptionRepository } from './billing-subscription-repository.js';

export type StripeWebhookServiceDeps = {
  provider: BillingProviderPort;
  repository: BillingSubscriptionRepository;
};

export type StripeWebhookResult = {
  received: true;
  applied: boolean;
  reason?: string;
  eventType?: string;
  eventId?: string;
};

/**
 * Verified Stripe webhook processing — shared by Nest transport (retained in B15).
 */
export class StripeWebhookService {
  constructor(private readonly deps: StripeWebhookServiceDeps) {}

  async handleWebhook(rawBody: Buffer | string, signature: string | undefined): Promise<StripeWebhookResult> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new BillingValidationError('Webhook secret not configured');
    }
    if (!signature) {
      throw new BillingValidationError('Missing stripe-signature header');
    }
    if (!this.deps.provider.isConfigured()) {
      throw new BillingValidationError('Unable to verify webhook signature', {
        error: 'Unable to verify webhook signature',
        code: 'STRIPE_SDK_UNAVAILABLE',
      });
    }

    let event;
    try {
      event = await this.deps.provider.constructWebhookEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BillingValidationError('Invalid stripe signature', {
        error: 'Invalid stripe signature',
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const object = event.data?.object || {};
    const eventId = event.id ? String(event.id) : '';

    if (eventId) {
      const prior = await this.deps.repository.findWebhookEventById(eventId);
      if (prior) {
        return { received: true, applied: false, reason: 'duplicate', eventId, eventType: event.type };
      }
    }

    const applyResult = await this.applyStripeWebhookEvent(event.type, object);

    if (eventId) {
      await this.deps.repository.createWebhookEvent({
        eventId,
        eventType: event.type,
        status: applyResult.applied ? 'processed' : 'skipped',
        metadata: applyResult,
      });
    }

    return { received: true, ...applyResult, eventType: event.type, eventId };
  }

  private async applyStripeWebhookEvent(
    eventType: string,
    object: Record<string, unknown>,
  ): Promise<{ applied: boolean; reason?: string }> {
    if (eventType === 'checkout.session.completed') {
      const userId = String(
        object.client_reference_id ||
          (object.metadata as Record<string, unknown> | undefined)?.userId ||
          '',
      );
      if (!userId) {
        return { applied: false, reason: 'missing_user_binding' };
      }
      const sub = await this.deps.repository.getOrCreateForUser(userId);
      await this.deps.repository.updateById(sub.id, {
        status: 'active',
        stripeCustomerId: object.customer ? String(object.customer) : sub.stripeCustomerId,
        stripeSubscriptionId: object.subscription
          ? String(object.subscription)
          : sub.stripeSubscriptionId,
      });
      return { applied: true };
    }

    if (
      eventType === 'customer.subscription.deleted' ||
      eventType === 'customer.subscription.updated'
    ) {
      const stripeSubId = object.id ? String(object.id) : '';
      const status = String(object.status || '').toLowerCase();
      if (!stripeSubId) {
        return { applied: false, reason: 'unknown_subscription' };
      }
      const existing = await this.deps.repository.findByStripeSubscriptionId(stripeSubId);
      if (!existing) {
        return { applied: false, reason: 'unknown_subscription' };
      }
      const nextStatus =
        eventType === 'customer.subscription.deleted'
          ? 'canceled'
          : status === 'active' ||
              status === 'trialing' ||
              status === 'past_due' ||
              status === 'canceled'
            ? status
            : existing.status;
      await this.deps.repository.updateById(existing.id, { status: nextStatus });
      return { applied: true };
    }

    if (eventType === 'invoice.payment_failed') {
      const stripeSubId = object.subscription ? String(object.subscription) : '';
      if (!stripeSubId) {
        return { applied: false, reason: 'unknown_subscription' };
      }
      const existing = await this.deps.repository.findByStripeSubscriptionId(stripeSubId);
      if (!existing) {
        return { applied: false, reason: 'unknown_subscription' };
      }
      await this.deps.repository.updateById(existing.id, { status: 'past_due' });
      return { applied: true };
    }

    return { applied: false, reason: 'unhandled_event_type' };
  }
}

export function createStripeWebhookService(deps: StripeWebhookServiceDeps): StripeWebhookService {
  return new StripeWebhookService(deps);
}
