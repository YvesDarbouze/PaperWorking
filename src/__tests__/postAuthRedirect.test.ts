/** @jest-environment jsdom */
import {
  resolvePostAuthDestination,
  buildSignupForPricingLoginUrl,
  DASHBOARD_ROUTE,
  PRICING_ROUTE,
} from '../lib/auth/postAuthRedirect';

describe('resolvePostAuthDestination', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('sends a returning user (sign-in) to their portfolio/dashboard', () => {
    expect(resolvePostAuthDestination({ isNewUser: false })).toBe(DASHBOARD_ROUTE);
  });

  it('sends a brand-new user (sign-up) to /pricing to pick a tier', () => {
    expect(resolvePostAuthDestination({ isNewUser: true })).toBe(PRICING_ROUTE);
  });

  it('defaults to the dashboard when no options are given', () => {
    expect(resolvePostAuthDestination()).toBe(DASHBOARD_ROUTE);
  });

  it('resumes checkout on /pricing when a pending plan exists, even for a new user', () => {
    sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan: 'Individual Investor' }));
    expect(resolvePostAuthDestination({ isNewUser: true })).toBe(PRICING_ROUTE);
  });

  it('honours an explicit redirectTo over the new-user default', () => {
    expect(
      resolvePostAuthDestination({ isNewUser: true, urlRedirectTo: '/dashboard/projects' }),
    ).toBe('/dashboard/projects');
  });

  it('honours a redirect saved before a social-OAuth round-trip for a returning user', () => {
    sessionStorage.setItem('pw_auth_redirect', '/dashboard/inbox');
    expect(resolvePostAuthDestination({ isNewUser: false })).toBe('/dashboard/inbox');
  });

  it('sends a returning user with a stale pending plan to /dashboard, not back to checkout', () => {
    sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan: 'Pro' }));
    sessionStorage.setItem('pw_auth_redirect', '/dashboard/inbox');
    expect(resolvePostAuthDestination({ isNewUser: false })).toBe('/dashboard/inbox');
    expect(sessionStorage.getItem('pw_auth_redirect')).toBeNull();
    expect(sessionStorage.getItem('pw_pending_plan')).toBe(JSON.stringify({ plan: 'Pro' }));
  });

  it('sends an already-subscribed user to the dashboard and discards a stale pending plan', () => {
    sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan: 'Pro' }));
    expect(resolvePostAuthDestination({ hasActiveSubscription: true })).toBe(DASHBOARD_ROUTE);
    expect(sessionStorage.getItem('pw_pending_plan')).toBeNull();
  });

  it('still honours an explicit redirectTo for an already-subscribed user', () => {
    sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan: 'Pro' }));
    expect(
      resolvePostAuthDestination({ hasActiveSubscription: true, urlRedirectTo: '/dashboard/projects' }),
    ).toBe('/dashboard/projects');
  });

  it('redirects to project creation if a pending project address exists and user has active subscription', () => {
    sessionStorage.setItem('pw_pending_project_address', JSON.stringify({ placeId: 'place_123', formattedAddress: '123 Main St' }));
    expect(resolvePostAuthDestination({ hasActiveSubscription: true })).toBe('/dashboard/projects/new');
    expect(sessionStorage.getItem('pw_auth_redirect')).toBeNull();
  });

  it('does NOT redirect to project creation if user is not subscribed yet', () => {
    sessionStorage.setItem('pw_pending_project_address', JSON.stringify({ placeId: 'place_123', formattedAddress: '123 Main St' }));
    expect(resolvePostAuthDestination({ hasActiveSubscription: false, isNewUser: true })).toBe(PRICING_ROUTE);
  });
});

describe('buildSignupForPricingLoginUrl', () => {
  it('builds the sign-up login URL with pricing redirect', () => {
    expect(buildSignupForPricingLoginUrl()).toBe('/login?mode=signup&redirectTo=%2Fpricing');
  });

  it('includes account type when provided', () => {
    expect(buildSignupForPricingLoginUrl({ accountType: 'investor' })).toBe(
      '/login?mode=signup&redirectTo=%2Fpricing&accountType=investor',
    );
  });
});
