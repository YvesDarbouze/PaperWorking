import { NextRequest, NextResponse } from 'next/server';
import { requireSubscriber, checkSubscriberStatus } from './requireSubscriber';

describe('requireSubscriber Middleware', () => {
  it('returns true when user has subscriptionStatus === "active"', () => {
    const user = { subscriptionStatus: 'active', role: 'investor' };
    expect(checkSubscriberStatus(user)).toBe(true);
  });

  it('returns false when user does not have active subscription', () => {
    expect(checkSubscriberStatus({ subscriptionStatus: 'inactive' })).toBe(false);
    expect(checkSubscriberStatus({ subscriptionStatus: 'canceled' })).toBe(false);
    expect(checkSubscriberStatus({ subscriptionStatus: 'none' })).toBe(false);
    expect(checkSubscriberStatus(null)).toBe(false);
    expect(checkSubscriberStatus(undefined)).toBe(false);
  });

  it('returns 403 JSON response with specific error when user is not an active subscriber', async () => {
    const req = new NextRequest('http://localhost:3000/deals');
    const response = requireSubscriber(req, { subscriptionStatus: 'inactive' });
    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(403);

    const json = await response?.json();
    expect(json).toEqual({ error: 'Subscription required to access the Deals Marketplace.' });
  });

  it('returns null (allowing request) when user has active subscription', () => {
    const req = new NextRequest('http://localhost:3000/deals');
    const response = requireSubscriber(req, { subscriptionStatus: 'active' });
    expect(response).toBeNull();
  });
});
