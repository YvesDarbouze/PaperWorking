import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import { createPortfolioInsightsReadService } from '@paperworking/services';
import {
  createPrismaAuthzStore,
  createPrismaPortfolioInsightsReadRepository,
} from '@paperworking/database';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Shared portfolio insights service for Nest GET /api/insights (Phase B17). */
export function buildNestPortfolioInsightsService(prisma: PrismaService) {
  const client = prisma.client;
  const authz = new CoreAuthorizationService(createPrismaAuthzStore(client));
  const repository = createPrismaPortfolioInsightsReadRepository(client);
  return createPortfolioInsightsReadService({ authz, repository });
}

export type NestPortfolioInsightsService = ReturnType<typeof buildNestPortfolioInsightsService>;
