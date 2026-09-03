import type { AuthUser } from '@paperworking/authz';
import type { BillingProviderPort } from './billing-provider-port.js';
import {
  BillingForbiddenError,
  BillingUnavailableError,
  BillingValidationError,
} from './billing-errors.js';
import {
  assertMockCheckoutSessionOwned,
  buildMockCheckoutUrl,
  createMockCheckoutSessionId,
  shouldUseMockBilling,
  stripeMockAllowed,
} from './billing-mock.js';
import type { BillingSubscriptionRepository } from './billing-subscription-repository.js';
import {
  resolveAllowedBillingRedirectUrl,
} from './billing-url-security.js';
import {
  resolvePlanId,
  resolveStripePriceId,
  validateAllowlistedPriceId,
  type BillingInterval,
  type PlanId,
} from './plans.js';

export type BillingCheckoutInput = {
  plan?: unknown;
  billingInterval?: unknown;
  priceId?: unknown;
  price?: unknown;
  successUrl?: unknown;
  cancelUrl?: unknown;
  customerId?: unknown;
  stripeCustomerId?: unknown;
  userId?: unknown;
  organizationId?: unknown;
};

export type BillingCheckoutResult = {
  success: true;
  url: string;
  sessionId: string;
  mock?: boolean;
};

export type BillingCheckoutServiceDeps = {
  provider: BillingProviderPort;
  repository: BillingSubscriptionRepository;
};

function resolveCheckoutPriceId(input: BillingCheckoutInput): string {
  void input.customerId;
  void input.stripeCustomerId;
  void input.userId;
  void input.organizationId;

  const planKey = typeof input.plan === 'string' ? input.plan.trim() : '';
  const interval: BillingInterval = input.billingInterval === 'annual' ? 'annual' : 'monthly';

  if (planKey) {
    const planId = resolvePlanId(planKey);
    if (!planId) {
      throw new BillingValidationError(`Unrecognized plan "${planKey}"`);
    }
    const priceId = resolveStripePriceId(planId, interval);
    if (!priceId) {
      throw new BillingValidationError(
        `No Stripe price configured for plan "${planKey}" (${interval})`,
      );
    }
    return priceId;
  }

  const rawPrice = typeof input.priceId === 'string' ? input.priceId : typeof input.price === 'string' ? input.price : '';
  if (rawPrice) {
    const allowlisted = validateAllowlistedPriceId(rawPrice);
    if (!allowlisted) {
      throw new BillingValidationError('Invalid or unconfigured price ID');
    }
    return allowlisted;
  }

  // UI "Change plan" with no plan — default to individual monthly.
  const defaultPrice = resolveStripePriceId('individual' as PlanId, 'monthly');
  if (!defaultPrice) {
    throw new BillingValidationError('No default Stripe price configured');
  }
  return defaultPrice;
}

export class BillingCheckoutService {
  constructor(private readonly deps: BillingCheckoutServiceDeps) {}

  async createCheckout(user: AuthUser, input: BillingCheckoutInput): Promise<BillingCheckoutResult> {
    const successUrl = resolveAllowedBillingRedirectUrl(
      typeof input.successUrl === 'string' ? input.successUrl : undefined,
      process.env.STRIPE_SUCCESS_URL,
      'http://localhost:3000/billing?success=1',
    );
    const cancelUrl = resolveAllowedBillingRedirectUrl(
      typeof input.cancelUrl === 'string' ? input.cancelUrl : undefined,
      process.env.STRIPE_CANCEL_URL,
      'http://localhost:3000/billing?canceled=1',
    );

    const useMock = shouldUseMockBilling();
    if (useMock) {
      if (process.env.NODE_ENV === 'production' || !stripeMockAllowed()) {
        throw new BillingUnavailableError({ error: 'Stripe not configured' });
      }
      const sessionId = createMockCheckoutSessionId(user.uid);
      return {
        success: true,
        url: buildMockCheckoutUrl(successUrl, sessionId),
        sessionId,
        mock: true,
      };
    }

    const priceId = resolveCheckoutPriceId(input);
    if (!this.deps.provider.isConfigured()) {
      throw new BillingUnavailableError({ error: 'Stripe not configured' });
    }

    const sub = await this.deps.repository.getOrCreateForUser(user.uid);
    const session = await this.deps.provider.createCheckoutSession({
      userId: user.uid,
      priceId,
      stripeCustomerId: sub.stripeCustomerId,
      successUrl,
      cancelUrl,
      metadata: { userId: user.uid },
    });

    return { success: true, url: session.url, sessionId: session.sessionId };
  }

  async getSessionStatus(user: AuthUser, sessionId?: string) {
    if (!sessionId?.trim()) {
      throw new BillingValidationError('session_id required');
    }

    if (sessionId.startsWith('cs_test_mock_')) {
      if (!stripeMockAllowed()) {
        throw new BillingUnavailableError({ error: 'Stripe session verification unavailable' });
      }
      try {
        assertMockCheckoutSessionOwned(user.uid, sessionId);
      } catch {
        throw new BillingForbiddenError({ error: 'Forbidden', reason: 'stripe_session' });
      }
      return {
        success: true,
        session: {
          id: sessionId,
          status: 'complete',
          payment_status: 'paid',
          mock: true,
        },
      };
    }

    if (!this.deps.provider.isConfigured()) {
      throw new BillingUnavailableError({ error: 'Stripe session verification unavailable' });
    }

    const sub = await this.deps.repository.findByUserId(user.uid);
    const session = await this.deps.provider.retrieveCheckoutSession(sessionId);
    this.assertStripeSessionOwnedByUser(user, session, sub?.stripeCustomerId);

    return {
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer: session.customer,
      },
    };
  }

  private assertStripeSessionOwnedByUser(
    user: AuthUser,
    session: {
      client_reference_id?: string | null;
      metadata?: Record<string, unknown> | null;
      customer?: string | { id?: string } | null;
    },
    ownedCustomerId?: string | null,
  ): void {
    const metaUser =
      session.metadata && typeof session.metadata.userId === 'string'
        ? session.metadata.userId
        : null;
    const ref = session.client_reference_id || null;
    if (ref === user.uid || metaUser === user.uid) return;

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer && typeof session.customer === 'object'
          ? session.customer.id
          : null;
    if (ownedCustomerId && customerId && customerId === ownedCustomerId) return;

    throw new BillingForbiddenError({ error: 'Forbidden', reason: 'stripe_session' });
  }
}

export function createBillingCheckoutService(deps: BillingCheckoutServiceDeps): BillingCheckoutService {
  return new BillingCheckoutService(deps);
}
