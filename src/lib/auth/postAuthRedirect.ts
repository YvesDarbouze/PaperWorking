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
 *   - EXCEPT: a user who already has an active subscription never gets routed
 *     to /pricing to "resume" a checkout — that pending intent is almost always
 *     stale (set before an earlier login, never cleaned up) and would otherwise
 *     re-trigger a brand-new Stripe Checkout session for someone who's already
 *     paying. Explicit redirectTo/OAuth-redirect intents still win in that case.
 */

/** The user's real-estate "Portfolio" — traditionally called the dashboard. */
export const DASHBOARD_ROUTE = '/dashboard';

/** Tier-selection page a new user must visit before entering the app. */
export const PRICING_ROUTE = '/pricing';

/** Login URL for the sign-up → pricing → checkout funnel. */
export function buildSignupForPricingLoginUrl(options?: {
  accountType?: string;
  redirectTo?: string;
}): string {
  const params = new URLSearchParams();
  params.set('mode', 'signup');
  params.set('redirectTo', options?.redirectTo ?? PRICING_ROUTE);
  if (options?.accountType) params.set('accountType', options.accountType);
  return `/login?${params.toString()}`;
}

export interface PostAuthOptions {
  /** True when this auth completed a sign-up (new account), not a sign-in. */
  isNewUser?: boolean;
  /** Explicit ?redirectTo=/... param captured on the login page, if any. */
  urlRedirectTo?: string;
  /** True when the authenticating account already has an active/trialing subscription. */
  hasActiveSubscription?: boolean;
}

/**
 * Resolve the destination path to send the user to after auth succeeds.
 * Consumes one-time sessionStorage intents (`pw_pending_plan`,
 * `pw_auth_redirect`) as a side effect, matching the pre-existing behaviour.
 */
export function resolvePostAuthDestination({
  isNewUser = false,
  urlRedirectTo = '',
  hasActiveSubscription = false,
}: PostAuthOptions = {}): string {
  // SSR / non-browser: no sessionStorage — fall back to explicit param or dashboard.
  if (typeof window === 'undefined') {
    return urlRedirectTo || DASHBOARD_ROUTE;
  }

  // Already-paying account: a pending checkout intent can only be stale (left
  // over from before an earlier login), so discard it instead of re-resuming
  // checkout. Explicit redirect intents below still apply.
  if (hasActiveSubscription) {
    sessionStorage.removeItem('pw_pending_plan');
  }

  // 1. Pending checkout intent → resume Stripe checkout on /pricing.
  //    Only for brand-new sign-ups — returning sign-ins must land on the portfolio.
  if (isNewUser && !hasActiveSubscription && sessionStorage.getItem('pw_pending_plan')) {
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
