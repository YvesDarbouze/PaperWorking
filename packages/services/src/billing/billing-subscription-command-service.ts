import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import type { BillingProviderPort } from './billing-provider-port.js';
import {
  BillingForbiddenError,
  BillingUnavailableError,
  BillingValidationError,
} from './billing-errors.js';
import { isFreePlan, hasVerifiedPaidSubscription } from './entitlement.js';
import type { BillingSubscriptionRepository } from './billing-subscription-repository.js';
import { shouldUseMockBilling } from './billing-mock.js';

export type BillingSubscriptionCommandInput = {
  planId?: unknown;
  plan?: unknown;
  status?: unknown;
  subscriptionStatus?: unknown;
  paymentStatus?: unknown;
  stripeSubscriptionId?: unknown;
  organizationId?: unknown;
  userId?: unknown;
  prorationMode?: unknown;
};

export type BillingSubscriptionCommandServiceDeps = {
  authz: AuthorizationService;
  provider: BillingProviderPort;
  repository: BillingSubscriptionRepository;
};

export class BillingSubscriptionCommandService {
  constructor(private readonly deps: BillingSubscriptionCommandServiceDeps) {}

  async cancelSubscription(user: AuthUser): Promise<{ success: true; subscriptionStatus: string | null }> {
    this.deps.authz.assertPermission(user, 'billing.manage');
    const sub = await this.deps.repository.getOrCreateForUser(user.uid);

    if (sub.stripeSubscriptionId) {
      if (shouldUseMockBilling() || !this.deps.provider.isConfigured()) {
        throw new BillingUnavailableError({ error: 'Stripe not configured' });
      }
      await this.deps.provider.cancelSubscription(sub.stripeSubscriptionId);
    } else if (!isFreePlan(sub.plan || 'Individual')) {
      throw new BillingForbiddenError({
        error: 'Use Stripe customer portal to cancel paid subscription',
        code: 'PORTAL_REQUIRED',
      });
    }

    const updated = await this.deps.repository.updateById(sub.id, { status: 'canceled' });
    return { success: true, subscriptionStatus: updated.status };
  }

  async changePlan(user: AuthUser, input: BillingSubscriptionCommandInput) {
    this.deps.authz.assertPermission(user, 'billing.manage');
    void input.status;
    void input.subscriptionStatus;
    void input.paymentStatus;
    void input.stripeSubscriptionId;
    void input.organizationId;
    if (typeof input.userId === 'string' && input.userId !== user.uid) {
      throw new BillingForbiddenError({ error: 'Forbidden', reason: 'ownership' });
    }

    const planId = String(input.planId || input.plan || '');
    if (!planId) {
      throw new BillingValidationError('planId required');
    }

    const sub = await this.deps.repository.getOrCreateForUser(user.uid);

    if (isFreePlan(planId)) {
      const updated = await this.deps.repository.updateById(sub.id, {
        plan: planId,
        status: 'active',
      });
      return {
        success: true,
        plan: planId,
        subscriptionStatus: updated.status,
        entitlement: 'free',
        prorationModeApplied: 'none',
      };
    }

    if (!hasVerifiedPaidSubscription(sub)) {
      throw new BillingForbiddenError({
        error: 'Payment required',
        code: 'CHECKOUT_REQUIRED',
        message: 'Use Stripe checkout to activate a paid plan',
      });
    }

    const updated = await this.deps.repository.updateById(sub.id, { plan: planId });
    return {
      success: true,
      plan: planId,
      subscriptionStatus: updated.status,
      entitlement: 'paid',
      prorationModeApplied: input.prorationMode || 'none',
    };
  }

  async reactivateSubscription(user: AuthUser) {
    this.deps.authz.assertPermission(user, 'billing.manage');
    const sub = await this.deps.repository.getOrCreateForUser(user.uid);

    if (isFreePlan(sub.plan || 'Individual')) {
      const updated = await this.deps.repository.updateById(sub.id, { status: 'active' });
      return { success: true, subscriptionStatus: updated.status, entitlement: 'free' };
    }

    if (!sub.stripeSubscriptionId) {
      throw new BillingForbiddenError({
        error: 'Payment required',
        code: 'CHECKOUT_REQUIRED',
        message: 'Cannot reactivate a paid plan without Stripe subscription',
      });
    }

    throw new BillingForbiddenError({
      error: 'Use Stripe customer portal to reactivate',
      code: 'PORTAL_REQUIRED',
    });
  }
}

export function createBillingSubscriptionCommandService(
  deps: BillingSubscriptionCommandServiceDeps,
): BillingSubscriptionCommandService {
  return new BillingSubscriptionCommandService(deps);
}
