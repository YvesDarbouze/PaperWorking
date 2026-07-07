/** @jest-environment jsdom */
/**
 * Regression coverage for the pricing-page checkout fix:
 *
 *   Before: an unauthenticated visitor selecting a plan proceeded as a
 *   Stripe "guest" — no idToken sent, no redirect to log in.
 *
 *   After: guest checkout is removed. An unauthenticated visitor is
 *   stashed to sessionStorage (`pw_pending_plan`) and redirected to
 *   /login?redirectTo=/pricing. Once they return authenticated, the page
 *   auto-resumes the checkout for the plan they originally picked instead
 *   of making them click again.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';

var mockPush = jest.fn();
var mockReplace = jest.fn();
var mockUser: any = null;
var mockProfile: any = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: mockProfile }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/components/landing/LandingHeader', () => () => <div data-testid="header" />);
jest.mock('@/components/landing/LandingFooter', () => () => <div data-testid="footer" />);
jest.mock('@/components/ui/CustomToaster', () => ({ CustomToaster: () => <div data-testid="toaster" /> }));

// Expose onSelectPlan so the test can trigger it directly, the same way a
// real pricing-card click would, without depending on PricingSection markup.
jest.mock('@/components/landing/PricingSection', () => ({
  __esModule: true,
  default: ({ onSelectPlan }: { onSelectPlan: (id: string) => void }) => (
    <button data-testid="select-investor-monthly" onClick={() => onSelectPlan('Investor Monthly')}>
      Select Investor
    </button>
  ),
}));

import PricingPage from '@/app/pricing/page';

describe('PricingPage — login-required checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockProfile = null;
    window.sessionStorage.clear();
    (global.fetch as any) = jest.fn();
  });

  it('redirects an unauthenticated visitor to /login and stashes the pending plan (no guest checkout)', async () => {
    const { getByTestId } = render(<PricingPage />);

    await act(async () => {
      fireEvent.click(getByTestId('select-investor-monthly'));
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/login?mode=signup&redirectTo=%2Fpricing',
    );
    expect(global.fetch).not.toHaveBeenCalled();

    const stashed = JSON.parse(sessionStorage.getItem('pw_pending_plan')!);
    expect(stashed).toEqual({ plan: 'Investor', interval: 'monthly', identifier: 'Investor Monthly' });
  });

  it('auto-resumes checkout for the stashed plan once the user becomes authenticated', async () => {
    sessionStorage.setItem(
      'pw_pending_plan',
      JSON.stringify({ plan: 'Investor', interval: 'monthly', identifier: 'Investor Monthly' })
    );

    mockUser = {
      uid: 'uid-1',
      email: 'user@example.com',
      getIdToken: jest.fn().mockResolvedValue('id-token-1'),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/resumed-session' }),
    });

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<PricingPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    const sentBody = JSON.parse(requestInit.body);
    expect(sentBody).toMatchObject({ plan: 'Investor', billingInterval: 'monthly', idToken: 'id-token-1', userId: 'uid-1' });

    // Consumed exactly once — a second render/effect pass must not re-fire it.
    expect(sessionStorage.getItem('pw_pending_plan')).toBeNull();

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('does nothing on mount when there is no stashed plan and no user', () => {
    render(<PricingPage />);
    expect(mockPush).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('bounces an already-subscribed user straight to the dashboard instead of re-resuming checkout', async () => {
    // Simulates landing back on /pricing with a stale pending-plan intent —
    // e.g. a Stripe Checkout cancel_url bounce, or a leftover intent from a
    // previous, unrelated login — while the account already has an active plan.
    sessionStorage.setItem(
      'pw_pending_plan',
      JSON.stringify({ plan: 'Investor', interval: 'monthly', identifier: 'Investor Monthly' })
    );
    mockUser = { uid: 'uid-1', email: 'user@example.com', getIdToken: jest.fn() };
    mockProfile = { subscriptionPlan: 'Individual', subscriptionStatus: 'active' };

    render(<PricingPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('pw_pending_plan')).toBeNull();
  });
});
