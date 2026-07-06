/** @jest-environment jsdom */
import {
  resolvePostAuthDestination,
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

  it('lets a pending plan win over a saved OAuth redirect and clears the redirect', () => {
    sessionStorage.setItem('pw_pending_plan', JSON.stringify({ plan: 'Pro' }));
    sessionStorage.setItem('pw_auth_redirect', '/dashboard/inbox');
    expect(resolvePostAuthDestination({ isNewUser: false })).toBe(PRICING_ROUTE);
    expect(sessionStorage.getItem('pw_auth_redirect')).toBeNull();
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
});
