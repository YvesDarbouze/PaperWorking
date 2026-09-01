import type { AuthUser } from '@paperworking/authz';
import type { BillingSubscriptionRepository } from './billing-subscription-repository.js';

export type BillingReadServiceDeps = {
  repository: BillingSubscriptionRepository;
};

export type BillingSummaryResult = {
  success: true;
  plan: string | null;
  status: string | null;
  subscription: {
    id: string;
    plan: string | null;
    status: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
  paymentMethods: [];
  invoices: [];
};

/**
 * Read billing summary from Neon subscription projection — no live Stripe call.
 */
export class BillingReadService {
  constructor(private readonly deps: BillingReadServiceDeps) {}

  async getSummary(user: AuthUser): Promise<BillingSummaryResult> {
    const sub = await this.deps.repository.getOrCreateForUser(user.uid);
    return {
      success: true,
      plan: sub.plan,
      status: sub.status,
      subscription: {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
      },
      paymentMethods: [],
      invoices: [],
    };
  }
}

export function createBillingReadService(deps: BillingReadServiceDeps): BillingReadService {
  return new BillingReadService(deps);
}
