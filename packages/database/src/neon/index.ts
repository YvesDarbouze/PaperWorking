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
export { createPrismaProjectsReadRepository } from './prisma-projects-read-repository.js';
export { createPrismaInboxReadRepository } from './prisma-inbox-read-repository.js';
export { createPrismaInboxCommandRepository } from './prisma-inbox-command-repository.js';
export { createPrismaPortfolioMetricsReadRepository } from './prisma-portfolio-metrics-read-repository.js';
export { createPrismaTeamMembersReadRepository } from './prisma-team-members-read-repository.js';
export { createPrismaMarketplaceProfileReadRepository } from './prisma-marketplace-profile-read-repository.js';
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
