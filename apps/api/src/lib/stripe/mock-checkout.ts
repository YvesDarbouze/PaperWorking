/**
 * Mock Stripe Checkout adapter.
 *
 * Honours the mandatory mock-fallback pattern (AGENTS.md): the app must stay
 * runnable without third-party credentials. When no real Stripe secret key is
 * configured — or `STRIPE_PROVIDER=mock` is set explicitly — the checkout flow
 * simulates a completed Checkout Session instead of throwing a 500.
 *
 * The mock session id is self-describing: it carries a base64url-encoded
 * payload (plan, interval, email, trial end) so `/api/stripe/session-status`
 * can resolve it without any Stripe call. Mock ids only ever exist in
 * environments where Stripe is unconfigured, so there is no production impact.
 */

import {
  PLAN_CATALOG,
  getCanonicalPlanName,
  type BillingInterval,
  type PlanId,
} from './plans.js';

/** Prefix that marks a checkout session as mock (no real Stripe). */
export const MOCK_SESSION_PREFIX = 'cs_mock_';

/**
 * True when the checkout flow should use the mock adapter instead of Stripe:
 * either explicitly (`STRIPE_PROVIDER=mock`) or because no secret key is set.
 */
export function shouldUseMockCheckout(): boolean {
  if (process.env.STRIPE_PROVIDER === 'mock') return true;
  return !process.env.STRIPE_SECRET_KEY;
}

interface MockSessionPayload {
  plan: string;
  planId: PlanId;
  billingInterval: BillingInterval;
  email: string | null;
  trialEnd: string | null;
}

function encode(payload: MockSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decode(token: string): MockSessionPayload | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as MockSessionPayload;
  } catch {
    return null;
  }
}

export interface MockCheckoutInput {
  planId: PlanId;
  interval: BillingInterval;
  email?: string | null;
}

/**
 * Build a mock Checkout Session. Returns an id that encodes the plan context so
 * the success page can render trial details without a real Stripe lookup.
 */
export function createMockCheckoutSession({ planId, interval, email }: MockCheckoutInput): { id: string } {
  const plan = getCanonicalPlanName(planId);
  const trialDays = PLAN_CATALOG[planId]?.trialDays ?? 0;
  const trialEnd = trialDays > 0
    ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const payload: MockSessionPayload = {
    plan,
    planId,
    billingInterval: interval,
    email: email ?? null,
    trialEnd,
  };

  return { id: MOCK_SESSION_PREFIX + encode(payload) };
}

/** True when a session id belongs to the mock adapter. */
export function isMockSessionId(sessionId: string): boolean {
  return sessionId.startsWith(MOCK_SESSION_PREFIX);
}

/**
 * Resolve a mock session id to the same shape `/api/stripe/session-status`
 * returns for a real Stripe session. Returns null if the id can't be decoded.
 */
export function getMockSessionStatus(sessionId: string) {
  if (!isMockSessionId(sessionId)) return null;
  const payload = decode(sessionId.slice(MOCK_SESSION_PREFIX.length));
  if (!payload) return null;

  return {
    status: 'complete',
    paymentStatus: 'no_payment_required',
    plan: payload.plan,
    planId: payload.planId,
    billingInterval: payload.billingInterval,
    customerEmail: payload.email,
    subscriptionId: `sub_mock_${payload.planId}`,
    subscriptionStatus: payload.trialEnd ? 'trialing' : 'active',
    trialEnd: payload.trialEnd,
  };
}
