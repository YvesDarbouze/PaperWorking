import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createBillingCheckoutService,
  createBillingPortalService,
  createBillingReadService,
  createBillingSubscriptionCommandService,
  createStripeWebhookService,
} from '@paperworking/services';
import {
  createAuthzStore,
  createBillingSubscriptionRepository,
  createStripeBillingProvider,
} from '@paperworking/database';

export function buildNestBillingServices() {
  const repository = createBillingSubscriptionRepository();
  const provider = createStripeBillingProvider();
  const authz = new CoreAuthorizationService(createAuthzStore());

  return {
    read: createBillingReadService({ repository }),
    checkout: createBillingCheckoutService({ repository, provider }),
    portal: createBillingPortalService({ repository, provider }),
    subscriptionCommand: createBillingSubscriptionCommandService({
      authz,
      repository,
      provider,
    }),
    webhook: createStripeWebhookService({ repository, provider }),
  };
}

export type NestBillingServices = ReturnType<typeof buildNestBillingServices>;
