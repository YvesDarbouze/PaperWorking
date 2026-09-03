import type { AuthUser } from '@paperworking/authz';
import type { BillingProviderPort } from './billing-provider-port.js';
import { BillingUnavailableError, BillingValidationError } from './billing-errors.js';
import { shouldUseMockBilling, stripeMockAllowed } from './billing-mock.js';
import type { BillingSubscriptionRepository } from './billing-subscription-repository.js';
import { resolveAllowedBillingRedirectUrl } from './billing-url-security.js';

export type BillingPortalInput = {
  returnUrl?: unknown;
  customerId?: unknown;
  stripeCustomerId?: unknown;
  userId?: unknown;
  organizationId?: unknown;
};

export type BillingPortalResult = {
  success: true;
  url: string;
  mock?: boolean;
};

export type BillingPortalServiceDeps = {
  provider: BillingProviderPort;
  repository: BillingSubscriptionRepository;
};

export class BillingPortalService {
  constructor(private readonly deps: BillingPortalServiceDeps) {}

  async createPortalSession(user: AuthUser, input: BillingPortalInput): Promise<BillingPortalResult> {
    void input.customerId;
    void input.stripeCustomerId;
    void input.userId;
    void input.organizationId;

    const returnUrl = resolveAllowedBillingRedirectUrl(
      typeof input.returnUrl === 'string' ? input.returnUrl : undefined,
      process.env.STRIPE_PORTAL_RETURN_URL,
      'http://localhost:3000/billing',
    );

    const sub = await this.deps.repository.getOrCreateForUser(user.uid);
    const useMock = shouldUseMockBilling();

    if (useMock) {
      if (process.env.NODE_ENV === 'production' || !stripeMockAllowed()) {
        throw new BillingUnavailableError({ error: 'Stripe not configured' });
      }
      return { success: true, url: returnUrl, mock: true };
    }

    if (!this.deps.provider.isConfigured()) {
      throw new BillingUnavailableError({ error: 'Stripe not configured' });
    }

    if (!sub.stripeCustomerId) {
      throw new BillingValidationError(
        'No Stripe customer on file — complete checkout before opening the billing portal',
      );
    }

    const session = await this.deps.provider.createPortalSession({
      stripeCustomerId: sub.stripeCustomerId,
      returnUrl,
    });

    return { success: true, url: session.url };
  }
}

export function createBillingPortalService(deps: BillingPortalServiceDeps): BillingPortalService {
  return new BillingPortalService(deps);
}
