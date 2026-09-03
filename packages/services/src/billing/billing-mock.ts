import type { BillingInterval, PlanId } from './plans.js';
import { getCanonicalPlanName, PLAN_CATALOG } from './plans.js';

export const MOCK_SESSION_PREFIX = 'cs_test_mock_';

export function shouldUseMockBilling(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.STRIPE_PROVIDER === 'mock') return true;
  return !process.env.STRIPE_SECRET_KEY?.trim();
}

export function stripeMockAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const flag = process.env.USE_MOCK_DATA ?? process.env.ENABLE_MOCK_AUTH;
  if (flag === 'false' || flag === '0') return false;
  return true;
}

export function createMockCheckoutSessionId(userId: string): string {
  return `${MOCK_SESSION_PREFIX}${userId}_${Date.now()}`;
}

export function assertMockCheckoutSessionOwned(userId: string, sessionId: string): void {
  const prefix = `${MOCK_SESSION_PREFIX}${userId}_`;
  if (!sessionId.startsWith(prefix)) {
    throw new Error('mock_session_forbidden');
  }
}

export function buildMockCheckoutUrl(successUrl: string, sessionId: string): string {
  const separator = successUrl.includes('?') ? '&' : '?';
  return `${successUrl}${separator}session_id=${encodeURIComponent(sessionId)}`;
}

export function createLegacyMockCheckoutSession(input: {
  planId: PlanId;
  interval: BillingInterval;
  email?: string | null;
}): { id: string } {
  const plan = getCanonicalPlanName(input.planId);
  const trialDays = PLAN_CATALOG[input.planId]?.trialDays ?? 0;
  const trialEnd =
    trialDays > 0
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const payload = {
    plan,
    planId: input.planId,
    billingInterval: input.interval,
    email: input.email ?? null,
    trialEnd,
  };

  const token = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return { id: `cs_mock_${token}` };
}
