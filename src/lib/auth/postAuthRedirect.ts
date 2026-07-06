/**
 * Post-authentication redirect resolver.
 *
 * Single source of truth for "where does a user land after they authenticate?".
 * Kept as a pure-ish helper (reads sessionStorage, returns a path) so the login
 * page stays thin and the rule is unit-testable.
 *
 * Rule of thumb:
 *   - A brand-new account (just signed up via the 14-day trial CTA) has no plan
 *     yet, so we send them to /pricing to pick a tier.
 *   - A returning user goes to their portfolio (a.k.a. the dashboard).
 *   - Explicit intent (pending Stripe checkout, an ?redirectTo= deep link, or a
 *     redirect stashed before a social-OAuth round-trip) always wins over both.
 */

/** The user's real-estate "Portfolio" — traditionally called the dashboard. */
export const DASHBOARD_ROUTE = '/dashboard';

/** Tier-selection page a new user must visit before entering the app. */
export const PRICING_ROUTE = '/pricing';

export interface PostAuthOptions {
  /** True when this auth completed a sign-up (new account), not a sign-in. */
  isNewUser?: boolean;
  /** Explicit ?redirectTo=/... param captured on the login page, if any. */
  urlRedirectTo?: string;
}

/**
 * Resolve the destination path to send the user to after auth succeeds.
 * Consumes one-time sessionStorage intents (`pw_pending_plan`,
 * `pw_auth_redirect`) as a side effect, matching the pre-existing behaviour.
 */
export function resolvePostAuthDestination({
  isNewUser = false,
  urlRedirectTo = '',
}: PostAuthOptions = {}): string {
  // SSR / non-browser: no sessionStorage — fall back to explicit param or dashboard.
  if (typeof window === 'undefined') {
    return urlRedirectTo || DASHBOARD_ROUTE;
  }

  // 1. Pending checkout intent → resume Stripe checkout on /pricing.
  if (sessionStorage.getItem('pw_pending_plan')) {
    sessionStorage.removeItem('pw_auth_redirect'); // clean up
    return PRICING_ROUTE;
  }

  // 2. Explicit redirect target from the URL (deep link / auth-guard bounce).
  if (urlRedirectTo) {
    sessionStorage.removeItem('pw_auth_redirect'); // clean up
    return urlRedirectTo;
  }

  // 3. Redirect saved before a social-OAuth round-trip (survives the redirect).
  const savedRedirect = sessionStorage.getItem('pw_auth_redirect');
  if (savedRedirect) {
    sessionStorage.removeItem('pw_auth_redirect'); // one-time use
    return savedRedirect;
  }

  // 4. Brand-new account with no plan yet → pick a tier first.
  if (isNewUser) {
    return PRICING_ROUTE;
  }

  // 5. Returning user → their portfolio.
  return DASHBOARD_ROUTE;
}
