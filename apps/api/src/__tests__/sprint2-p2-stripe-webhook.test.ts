/**
 * Sprint 2 P2 — Stripe webhook edge cases (pure logic mirror).
 */
import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

type Sub = {
  id: string;
  userId: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
};

function processWebhook(opts: {
  secret?: string;
  signature?: string;
  sdkAvailable?: boolean;
  verified?: boolean;
  event?: { type: string; data?: { object?: Record<string, unknown> } };
  subs: Sub[];
}) {
  if (!opts.secret) throw new BadRequestException({ error: 'Webhook secret not configured' });
  if (!opts.signature) {
    throw new BadRequestException({ error: 'Missing stripe-signature header' });
  }
  if (!opts.sdkAvailable) {
    throw new BadRequestException({
      error: 'Unable to verify webhook signature',
      code: 'STRIPE_SDK_UNAVAILABLE',
    });
  }
  // Unsigned JSON path removed — never grant without constructEvent.
  if (!opts.verified || !opts.event) {
    throw new BadRequestException({ error: 'Invalid stripe signature' });
  }

  const object = opts.event.data?.object || {};
  if (opts.event.type === 'checkout.session.completed') {
    const userId = String(
      object.client_reference_id ||
        (object.metadata as Record<string, unknown> | undefined)?.userId ||
        '',
    );
    if (!userId) return { received: true, applied: false, reason: 'missing_user_binding' };
    let sub = opts.subs.find((s) => s.userId === userId);
    if (!sub) {
      sub = {
        id: `sub-${userId}`,
        userId,
        status: 'active',
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      };
      opts.subs.push(sub);
    }
    sub.status = 'active';
    if (object.subscription) sub.stripeSubscriptionId = String(object.subscription);
    return { received: true, applied: true };
  }

  if (opts.event.type === 'customer.subscription.deleted') {
    const id = object.id ? String(object.id) : '';
    const existing = opts.subs.find((s) => s.stripeSubscriptionId === id);
    if (!existing) return { received: true, applied: false, reason: 'unknown_subscription' };
    existing.status = 'canceled';
    return { received: true, applied: true };
  }

  if (opts.event.type === 'invoice.payment_failed') {
    const id = object.subscription ? String(object.subscription) : '';
    const existing = opts.subs.find((s) => s.stripeSubscriptionId === id);
    if (!existing) return { received: true, applied: false, reason: 'unknown_subscription' };
    existing.status = 'past_due';
    return { received: true, applied: true };
  }

  return { received: true, applied: false };
}

describe('Sprint 2 P2 — stripe webhook', () => {
  it('missing signature → rejected', () => {
    expect(() =>
      processWebhook({ secret: 'whsec', sdkAvailable: true, subs: [] }),
    ).toThrow(BadRequestException);
  });

  it('SDK unavailable (no unsigned parse) → rejected', () => {
    expect(() =>
      processWebhook({
        secret: 'whsec',
        signature: 'sig',
        sdkAvailable: false,
        subs: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('invalid / unverified signature → rejected', () => {
    expect(() =>
      processWebhook({
        secret: 'whsec',
        signature: 'sig',
        sdkAvailable: true,
        verified: false,
        subs: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('checkout without user binding → no entitlement', () => {
    const subs: Sub[] = [];
    const r = processWebhook({
      secret: 'whsec',
      signature: 'sig',
      sdkAvailable: true,
      verified: true,
      event: { type: 'checkout.session.completed', data: { object: {} } },
      subs,
    });
    expect(r.applied).toBe(false);
    expect(subs).toHaveLength(0);
  });

  it('verified checkout with user binding → activates', () => {
    const subs: Sub[] = [
      {
        id: 's1',
        userId: 'u1',
        status: 'inactive',
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      },
    ];
    const r = processWebhook({
      secret: 'whsec',
      signature: 'sig',
      sdkAvailable: true,
      verified: true,
      event: {
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'u1',
            subscription: 'sub_1',
          },
        },
      },
      subs,
    });
    expect(r.applied).toBe(true);
    expect(subs[0].status).toBe('active');
    expect(subs[0].stripeSubscriptionId).toBe('sub_1');
  });

  it('duplicate checkout event → idempotent-ish (stays active)', () => {
    const subs: Sub[] = [
      {
        id: 's1',
        userId: 'u1',
        status: 'active',
        stripeSubscriptionId: 'sub_1',
        stripeCustomerId: 'cus_1',
      },
    ];
    processWebhook({
      secret: 'whsec',
      signature: 'sig',
      sdkAvailable: true,
      verified: true,
      event: {
        type: 'checkout.session.completed',
        data: {
          object: { client_reference_id: 'u1', subscription: 'sub_1' },
        },
      },
      subs,
    });
    expect(subs[0].status).toBe('active');
  });

  it('unknown subscription cancel → safe no-op', () => {
    const r = processWebhook({
      secret: 'whsec',
      signature: 'sig',
      sdkAvailable: true,
      verified: true,
      event: {
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_unknown' } },
      },
      subs: [],
    });
    expect(r.applied).toBe(false);
  });

  it('payment_failed → past_due', () => {
    const subs: Sub[] = [
      {
        id: 's1',
        userId: 'u1',
        status: 'active',
        stripeSubscriptionId: 'sub_1',
        stripeCustomerId: null,
      },
    ];
    processWebhook({
      secret: 'whsec',
      signature: 'sig',
      sdkAvailable: true,
      verified: true,
      event: {
        type: 'invoice.payment_failed',
        data: { object: { subscription: 'sub_1' } },
      },
      subs,
    });
    expect(subs[0].status).toBe('past_due');
  });
});
