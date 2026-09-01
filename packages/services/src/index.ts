/**
 * Framework-independent application services extracted from Nest modules.
 */
export const SERVICES_PACKAGE_STATUS = 'phase-b4-team-members-read' as const;

export {
  SESSION_COOKIE,
  ACCT_COOKIE,
  SUB_COOKIE,
  SESSION_ID_COOKIE,
  NEST_SESSION_MAX_AGE_MS,
  NEXT_SESSION_MAX_AGE_SEC,
  nestCookieBaseOptions,
  nextCookieBaseOptions,
  encodeNestSubCookie,
  encodeNextSubCookie,
  buildSessionCookieDescriptors,
  buildClearSessionCookieDescriptors,
  createIdentityProvisioningService,
  SessionCommandService,
  sessionCommandService,
  type CookieDescriptor,
  type SessionCookieOptions,
  type SubscriptionLookup,
  type IdentityUserRepository,
  type IdentityProvisioningService,
  type EstablishSessionInput,
  type EstablishSessionResult,
  type SessionCookiePolicyKind,
  type CreateIdentityProvisioningServiceInput,
} from './auth/index.js';

export {
  normalizeClientAccountType,
  isPlatformAdminUser,
  readCookieFromHeader,
  buildAuthUserFromPostgresUser,
  buildAuthUserForUid,
  createPrismaSessionUserStore,
  resolveAuthUserFromAccessToken,
  resolveAuthUserFromCredentials,
  type AuthUser,
  type PostgresUserProfile,
  type SessionUserStore,
  type SessionResolverDeps,
  type SessionCredentials,
} from './session/index.js';

export {
  ProjectsReadService,
  ProjectsReadValidationError,
  createProjectsReadService,
  serializeProject,
  phaseNumberToName,
  type ProjectsReadRepository,
  type ProjectsReadServiceDeps,
  type ProjectsListResult,
  type ProjectGetResult,
  type SerializedProject,
} from './projects/index.js';

export {
  InboxReadService,
  createInboxReadService,
  serializeInboxThread,
  type InboxReadRepository,
  type InboxReadServiceDeps,
  type InboxItemRecord,
  type InboxThreadRecord,
  type InboxListResult,
} from './inbox/index.js';

export {
  PortfolioMetricsReadService,
  createPortfolioMetricsReadService,
  aggregatePortfolioMetricsFromProjects,
  type PortfolioMetricsReadRepository,
  type PortfolioMetricsReadServiceDeps,
  type PortfolioMetricsReadInput,
  type PortfolioMetricsProjectRow,
  type PortfolioMetricsResult,
  type PortfolioMetricsBlock,
  type PortfolioSummaryBlock,
} from './portfolio/index.js';

export {
  TeamMembersReadService,
  createTeamMembersReadService,
  type TeamMembersReadRepository,
  type TeamMembersReadServiceDeps,
  type TeamMembersReadInput,
  type TeamMembersListResult,
  type OrganizationMemberRecord,
} from './team/index.js';
