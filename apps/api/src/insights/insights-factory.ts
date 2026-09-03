import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import { createPortfolioInsightsReadService } from '@paperworking/services';
import {
  createAuthzStore,
  createPortfolioInsightsReadRepository,
} from '@paperworking/database';

/** Shared portfolio insights service for Nest GET /api/insights (Phase B17). */
export function buildNestPortfolioInsightsService() {
  const authz = new CoreAuthorizationService(createAuthzStore());
  const repository = createPortfolioInsightsReadRepository();
  return createPortfolioInsightsReadService({ authz, repository });
}

export type NestPortfolioInsightsService = ReturnType<typeof buildNestPortfolioInsightsService>;
