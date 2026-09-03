export {
  getMigrationPrismaClient,
  getApiPrismaClient,
  migrationDb,
  apiDb,
  resetMigrationPrismaForTests,
  type MigrationPrismaClient,
  type ApiPrismaClient,
  PrismaClient,
} from '../client.js';
export { createPrismaAuthzStore } from './prisma-authz-store.js';
export { createPrismaIdentityUserRepository } from './prisma-identity-user-repository.js';
export type { PrismaIdentityUserRepository } from './prisma-identity-user-repository.js';
export { createPrismaSessionUserStore } from './prisma-session-user-store.js';
export { createPrismaProjectsReadRepository } from './prisma-projects-read-repository.js';
export { createPrismaProjectsCommandRepository } from './prisma-projects-command-repository.js';
export { createPrismaProjectKpiReadRepository } from './prisma-project-kpi-read-repository.js';
export { createPrismaInboxReadRepository } from './prisma-inbox-read-repository.js';
export { createPrismaInboxCommandRepository } from './prisma-inbox-command-repository.js';
export { createPrismaPortfolioMetricsReadRepository } from './prisma-portfolio-metrics-read-repository.js';
export { createPrismaTeamMembersReadRepository } from './prisma-team-members-read-repository.js';
export { createPrismaTeamCommandRepository } from './prisma-team-command-repository.js';
export { createPrismaMarketplaceProfileReadRepository } from './prisma-marketplace-profile-read-repository.js';
export {
  createPrismaDealsReadRepository,
  createPrismaDealsCommandRepository,
} from './prisma-deals-repository.js';
export { createPrismaDealCommunicationRepository } from './prisma-deal-communication-repository.js';
export { createPrismaProjectDocumentsRepository } from './prisma-project-documents-repository.js';
export {
  createPrismaBillingSubscriptionRepository,
  type PrismaBillingSubscriptionRepository,
} from './prisma-billing-subscription-repository.js';
export {
  createPrismaReportsReadRepository,
  type PrismaReportsReadRepository,
} from './prisma-reports-read-repository.js';
export {
  createPrismaProfileSettingsRepository,
  type PrismaProfileSettingsRepository,
} from './prisma-profile-settings-repository.js';
export {
  createPrismaPortfolioInsightsReadRepository,
  type PrismaPortfolioInsightsReadRepository,
} from './prisma-portfolio-insights-read-repository.js';
export {
  createPrismaAdminReadRepository,
  type PrismaAdminReadRepository,
} from './prisma-admin-read-repository.js';
export {
  createPrismaMarketplaceInvestorsReadRepository,
  createPrismaVendorsReadRepository,
  createPrismaVendorPortalReadRepository,
} from './prisma-marketplace-vendors-read-repository.js';
export {
  createPrismaMarketplaceFollowCommandRepository,
  createPrismaVendorPortalCommandRepository,
} from './prisma-marketplace-vendor-command-repository.js';
export {
  resolveDatabaseAdapterMode,
  isNeonAdapterMode,
  resolveDatabaseUrl,
  DatabaseAdapterConfigError,
  type DatabaseAdapterMode,
} from './config.js';
export {
  createPgPrismaAdapter,
  createNeonPrismaAdapter,
  createPrismaDriverAdapter,
  resolvePrismaDriverAdapterKind,
  resetPgPoolForTests,
  type PrismaDriverAdapterKind,
} from './adapter.js';
export { remapUserPrimaryKey } from './user-id-remap.js';

export const NEON_PACKAGE_STATUS = 'phase-8-neon-adapter' as const;
