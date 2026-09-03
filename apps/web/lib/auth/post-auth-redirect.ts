import { AUTH_ROUTES } from './routes';
import { sanitizeRedirectPath } from '@/lib/auth/safe-redirect';

/** Portfolio — primary post-login / app entry destination. */
export const DASHBOARD_ROUTE = '/dashboard';
export const VENDOR_PORTAL_ROUTE = '/vendor-portal';
export const ADMIN_ROUTE = '/admin';
export const PRICING_ROUTE = '/pricing';

/** Primary in-app destination after sign-in (account-type aware). */
export function resolveAppHomeRoute(accountType?: string | null): string {
  const acct = (accountType ?? 'investor').toLowerCase();
  if (acct === 'vendor') return VENDOR_PORTAL_ROUTE;
  if (acct === 'admin') return ADMIN_ROUTE;
  return DASHBOARD_ROUTE;
}

export interface SessionStorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

export interface PostAuthOptions {
  isNewUser?: boolean;
  urlRedirectTo?: string;
  hasActiveSubscription?: boolean;
}

export function buildSignupForPricingLoginUrl(options?: {
  accountType?: string;
  redirectTo?: string;
}): string {
  const params = new URLSearchParams();
  params.set('mode', 'signup');
  params.set('redirectTo', options?.redirectTo ?? PRICING_ROUTE);
  if (options?.accountType) params.set('accountType', options.accountType);
  return `${AUTH_ROUTES.login}?${params.toString()}`;
}

export function buildSignupLoginUrl(options: {
  accountType: string;
  invite?: string | null;
  name?: string;
  email?: string;
}): string {
  if (options.invite) {
    const params = new URLSearchParams({
      accountType: options.accountType,
      mode: 'signup',
      redirectTo: `/invest/${options.invite}`,
      name: options.name ?? '',
      email: options.email ?? '',
    });
    return `${AUTH_ROUTES.login}?${params.toString()}`;
  }
  return buildSignupForPricingLoginUrl({ accountType: options.accountType });
}

export function resolvePostAuthDestination(
  {
    isNewUser = false,
    urlRedirectTo = '',
    hasActiveSubscription = false,
  }: PostAuthOptions = {},
  storage: SessionStorageLike | null = null,
): string {
  if (!storage) {
    return sanitizeRedirectPath(urlRedirectTo, DASHBOARD_ROUTE);
  }

  if (hasActiveSubscription) {
    storage.removeItem('pw_pending_plan');
  }

  const pendingProjectAddress = storage.getItem('pw_pending_project_address');
  if (pendingProjectAddress && hasActiveSubscription) {
    storage.removeItem('pw_auth_redirect');
    return '/projects/new';
  }

  if (isNewUser && !hasActiveSubscription && storage.getItem('pw_pending_plan')) {
    storage.removeItem('pw_auth_redirect');
    return PRICING_ROUTE;
  }

  if (urlRedirectTo) {
    storage.removeItem('pw_auth_redirect');
    return sanitizeRedirectPath(urlRedirectTo, DASHBOARD_ROUTE);
  }

  const savedRedirect = storage.getItem('pw_auth_redirect');
  if (savedRedirect) {
    storage.removeItem('pw_auth_redirect');
    return sanitizeRedirectPath(savedRedirect, DASHBOARD_ROUTE);
  }

  if (isNewUser) {
    return PRICING_ROUTE;
  }

  return DASHBOARD_ROUTE;
}
