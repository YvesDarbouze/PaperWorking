import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createBillingCheckoutService,
  createBillingPortalService,
  createBillingReadService,
  createBillingSubscriptionCommandService,
  createStripeWebhookService,
} from '@paperworking/services';
import {
  createPrismaAuthzStore,
  createPrismaBillingSubscriptionRepository,
  createStripeBillingProvider,
} from '@paperworking/database';
import type { PrismaService } from '../prisma/prisma.service.js';

export function buildNestBillingServices(prisma: PrismaService) {
  const client = prisma.client;
  const repository = createPrismaBillingSubscriptionRepository(client);
  const provider = createStripeBillingProvider();
  const authz = new CoreAuthorizationService(createPrismaAuthzStore(client));

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
