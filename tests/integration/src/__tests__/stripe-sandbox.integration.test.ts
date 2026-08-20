import {
  createMockCheckoutSession,
  handleStripeCheckoutPost,
  handleStripeSessionStatusGet,
  shouldUseMockCheckout,
} from '@paperworking/api';

describe('integration — stripe sandbox (mock checkout path)', () => {
  it('creates mock checkout session and resolves status', async () => {
    expect(shouldUseMockCheckout()).toBe(true);

    const checkout = await handleStripeCheckoutPost(
      { plan: 'Individual', billingInterval: 'monthly' },
      { useMockCheckout: () => true, appUrl: 'http://localhost:3000' },
    );

    expect(checkout.status).toBe(200);
    const checkoutBody = checkout.body as { url: string };
    const sessionId = new URL(checkoutBody.url).searchParams.get('session_id');
    expect(sessionId).toBeTruthy();

    const status = await handleStripeSessionStatusGet(
      { session_id: sessionId ?? undefined },
      { useMockCheckout: () => true },
    );

    expect(status.status).toBe(200);
    const statusBody = status.body as { status: string; planId: string };
    expect(statusBody.status).toBe('complete');
    expect(statusBody.planId).toBe('individual');
  });

  it('mock session factory matches handler expectations', () => {
    const { id } = createMockCheckoutSession({
      planId: 'team',
      interval: 'monthly',
      email: 'sandbox@paperworking.test',
    });

    expect(id).toContain('cs_mock_');
  });
});
