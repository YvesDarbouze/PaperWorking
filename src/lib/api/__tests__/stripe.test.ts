import { handleStripeWebhook, STRIPE_PLANS } from '../stripe';

describe('Agent 8: Stripe Integration Unit Tests', () => {
  test('1. STRIPE_PLANS exposes Standard, Team, and Vendor tiers correctly', () => {
    expect(STRIPE_PLANS.standard.priceMonthly).toBe(49);
    expect(STRIPE_PLANS.team.priceMonthly).toBe(199);
    expect(STRIPE_PLANS.vendor.priceMonthly).toBe(0);
  });

  test('2. handleStripeWebhook grants access on invoice.paid', () => {
    const res = handleStripeWebhook({
      type: 'invoice.paid',
      data: { object: { id: 'in_123', customer: 'cus_123' } },
    });
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('grant_access');
    expect(res.status).toBe('active');
  });

  test('3. handleStripeWebhook triggers grace period alert on invoice.payment_failed', () => {
    const res = handleStripeWebhook({
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_123', customer: 'cus_123' } },
    });
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('grace_period_alert');
    expect(res.status).toBe('past_due');
  });

  test('4. handleStripeWebhook revokes team features on customer.subscription.deleted', () => {
    const res = handleStripeWebhook({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123', customer: 'cus_123' } },
    });
    expect(res.handled).toBe(true);
    expect(res.actionTaken).toBe('revoke_team_features');
    expect(res.status).toBe('canceled');
  });
});
