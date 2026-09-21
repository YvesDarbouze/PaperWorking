/**
 * Internal Team-tier entitlement override for allowlisted operator accounts.
 *
 * Grants Team-tier entitlements to an explicit email allowlist without a Stripe
 * subscription. This is an app-level entitlement grant only — no billing records
 * are created and Stripe is never contacted.
 */

export const TEAM_TIER_EMAIL_ALLOWLIST_ENV = 'TEAM_TIER_EMAIL_ALLOWLIST';

/** Minimal effective-plan shape used by session cookies and /api/auth/me. */
export type EffectiveSubscription = { plan: string; status: string } | null;

/** Baseline operator emails that always operate as Team tier. */
export const DEFAULT_TEAM_TIER_EMAILS: readonly string[] = ['yvesdarbouze@gmail.com'];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Effective allowlist = built-in defaults ∪ `TEAM_TIER_EMAIL_ALLOWLIST` env
 * (comma-separated). The env var only adds emails; defaults cannot be removed
 * without a code change.
 */
export function teamTierEmailAllowlist(): Set<string> {
  const emails = new Set<string>(DEFAULT_TEAM_TIER_EMAILS.map(normalizeEmail));
  const env = process.env[TEAM_TIER_EMAIL_ALLOWLIST_ENV];
  if (env) {
    for (const entry of env.split(',')) {
      const email = normalizeEmail(entry);
      if (email) emails.add(email);
    }
  }
  return emails;
}

export function isTeamTierOverrideEmail(email?: string | null): boolean {
  if (!email) return false;
  return teamTierEmailAllowlist().has(normalizeEmail(email));
}

/**
 * Returns a Team/active snapshot when `email` is allowlisted; otherwise the
 * original subscription is passed through untouched.
 */
export function applyTeamTierOverride(
  email: string | null | undefined,
  subscription: EffectiveSubscription,
): EffectiveSubscription {
  if (!isTeamTierOverrideEmail(email)) return subscription;
  return { plan: 'Team', status: 'active' };
}
