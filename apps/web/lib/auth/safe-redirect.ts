import { DASHBOARD_ROUTE } from './post-auth-redirect';

/** Internal path prefixes allowed after login/OAuth. */
const ALLOWED_PREFIXES = [
  '/dashboard',
  '/pricing',
  '/projects',
  '/project',
  '/billing',
  '/login',
  '/auth',
  '/team',
  '/settings',
  '/deals',
  '/marketplace',
  '/invest',
  '/vendor-portal',
  '/reports',
  '/insights',
  '/onboarding',
] as const;

/**
 * Reject open redirects. Only same-app relative paths are allowed.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback: string = DASHBOARD_ROUTE,
): string {
  if (!raw || typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    trimmed.startsWith('//') ||
    trimmed.includes('://')
  ) {
    return fallback;
  }

  if (!trimmed.startsWith('/')) return fallback;

  const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
  if (!allowed) return fallback;

  return trimmed;
}

export function hasActiveSubscriptionStatus(status: string | null | undefined): boolean {
  const s = (status || '').trim().toLowerCase();
  return s === 'active' || s === 'trialing';
}
