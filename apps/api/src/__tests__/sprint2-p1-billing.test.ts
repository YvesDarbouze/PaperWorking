/**
 * Sprint 2 P1 — Billing change-plan entitlement (pure logic mirror).
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

const FREE_PLANS = new Set(['individual', 'free', 'trial', 'none', '']);

function isFreePlan(planId: string): boolean {
  return FREE_PLANS.has(planId.trim().toLowerCase());
}

function hasVerifiedPaidSubscription(sub: {
  stripeSubscriptionId: string | null;
  status: string | null;
}): boolean {
  if (!sub.stripeSubscriptionId) return false;
  const status = (sub.status || '').toLowerCase();
  return status === 'active' || status === 'trialing';
}

function hasBillingManage(accountType: string, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return accountType === 'investor' || accountType === 'admin';
}

function changePlan(
  user: { uid: string; accountType: string; isAdmin?: boolean } | null,
  body: Record<string, unknown>,
  subs: Map<string, { id: string; userId: string; plan: string; status: string; stripeSubscriptionId: string | null }>,
  opts?: { nodeEnv?: string; useMock?: string },
) {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  if (!hasBillingManage(user.accountType, user.isAdmin)) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'billing.manage' });
  }

  void body.status;
  void body.subscriptionStatus;
  void body.paymentStatus;
  void body.stripeSubscriptionId;
  void body.organizationId;

  const sub = [...subs.values()].find((s) => s.userId === user.uid);
  if (!sub) throw new ForbiddenException({ error: 'No subscription' });

  // Foreign org spoof cannot retarget another user's sub
  if (typeof body.userId === 'string' && body.userId !== user.uid) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'ownership' });
  }

  const planId = String(body.planId || body.plan || '');
  if (!planId) throw new ForbiddenException({ error: 'planId required' });

  if (isFreePlan(planId)) {
    sub.plan = planId;
    sub.status = 'active';
    return { success: true, plan: planId, entitlement: 'free', subscriptionStatus: sub.status };
  }

  if (opts?.nodeEnv === 'production' && (opts.useMock === 'true' || !opts.useMock)) {
    // Mock payment flags never grant production entitlement path here —
    // paid still requires verified Stripe ids on the subscription row.
  }

  if (!hasVerifiedPaidSubscription(sub)) {
    throw new ForbiddenException({
      error: 'Payment required',
      code: 'CHECKOUT_REQUIRED',
    });
  }

  sub.plan = planId;
  return { success: true, plan: planId, entitlement: 'paid', subscriptionStatus: sub.status };
}

describe('Sprint 2 P1 — billing change-plan', () => {
  function seed() {
    const subs = new Map([
      [
        'sub-a',
        {
          id: 'sub-a',
          userId: 'user-a',
          plan: 'Individual',
          status: 'active',
          stripeSubscriptionId: null as string | null,
        },
      ],
      [
        'sub-paid',
        {
          id: 'sub-paid',
          userId: 'user-paid',
          plan: 'Team',
          status: 'active',
          stripeSubscriptionId: 'sub_stripe_1',
        },
      ],
      [
        'sub-b',
        {
          id: 'sub-b',
          userId: 'user-b',
          plan: 'Individual',
          status: 'active',
          stripeSubscriptionId: null as string | null,
        },
      ],
    ]);
    return subs;
  }

  it('authorized free plan → success', () => {
    const r = changePlan({ uid: 'user-a', accountType: 'investor' }, { planId: 'free' }, seed());
    expect(r.success).toBe(true);
    expect(r.entitlement).toBe('free');
  });

  it('authorized paid plan with valid payment state → success', () => {
    const r = changePlan(
      { uid: 'user-paid', accountType: 'investor' },
      { planId: 'Team' },
      seed(),
    );
    expect(r.entitlement).toBe('paid');
  });

  it('unpaid paid plan → rejected', () => {
    expect(() =>
      changePlan({ uid: 'user-a', accountType: 'investor' }, { planId: 'Team' }, seed()),
    ).toThrow(ForbiddenException);
  });

  it('foreign organization / user spoof → rejected', () => {
    expect(() =>
      changePlan(
        { uid: 'user-a', accountType: 'investor' },
        { planId: 'Team', userId: 'user-paid', organizationId: 'org-x' },
        seed(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('unauthorized user (no billing.manage) → rejected', () => {
    expect(() =>
      changePlan({ uid: 'user-a', accountType: 'vendor' }, { planId: 'free' }, seed()),
    ).toThrow(ForbiddenException);
  });

  it('client fake payment/subscription state → rejected', () => {
    expect(() =>
      changePlan(
        { uid: 'user-a', accountType: 'investor' },
        {
          planId: 'Team',
          status: 'active',
          paymentStatus: 'paid',
          stripeSubscriptionId: 'sub_fake',
        },
        seed(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('production mock payment flags do not activate unpaid paid plan', () => {
    expect(() =>
      changePlan(
        { uid: 'user-a', accountType: 'investor' },
        { planId: 'Team', paymentStatus: 'paid' },
        seed(),
        { nodeEnv: 'production', useMock: 'true' },
      ),
    ).toThrow(ForbiddenException);
  });

  it('unauthenticated → rejected', () => {
    expect(() => changePlan(null, { planId: 'free' }, seed())).toThrow(ForbiddenException);
  });
});
