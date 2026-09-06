import type { HealthCheckDeps, AuthMeDeps, SessionPostDeps, SessionDeleteDeps } from '@paperworking/api';
import { circuitBreakers } from '@paperworking/api';
import {
  AuthorizationService,
  validateCsrf as authzValidateCsrf,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createIdentityProvisioningService,
  createProjectsReadService,
  createProjectsCommandService,
  createProjectKpiReadService,
  createInboxReadService,
  createInboxCommandService,
  createPortfolioMetricsReadService,
  createTeamMembersReadService,
  createTeamCommandService,
  createMarketplaceProfileReadService,
  createMarketplaceInvestorsReadService,
  createMarketplaceFollowCommandService,
  createDealsReadService,
  createDealsCommandService,
  createDealBroadcastService,
  createDealReplyService,
  createProjectDocumentsReadService,
  createProjectDocumentsCommandService,
  createVendorsReadService,
  createVendorPortalReadService,
  createVendorPortalCommandService,
  createBillingReadService,
  createBillingCheckoutService,
  createBillingPortalService,
  createBillingSubscriptionCommandService,
  createReportsReadService,
  createReportsGenerateService,
  createProfileReadService,
  createProfileCommandService,
  createPortfolioInsightsReadService,
  createAdminOpsReadService,
  createAdminRentcastReadService,
  createAdminLenderReadService,
  createAdminAgentCrewReadService,
  createAdminAgentCrewCommandService,
  createAdminUserCommandService,
  resolveAuthUserFromCredentials,
  sessionCommandService,
  type ProjectsReadService,
  type ProjectsCommandService,
  type ProjectKpiReadService,
  type InboxReadService,
  type InboxCommandService,
  type PortfolioMetricsReadService,
  type TeamMembersReadService,
  type TeamCommandService,
  type MarketplaceProfileReadService,
  type MarketplaceInvestorsReadService,
  type MarketplaceFollowCommandService,
  type DealsReadService,
  type DealsCommandService,
  type DealBroadcastService,
  type DealReplyService,
  type ProjectDocumentsReadService,
  type ProjectDocumentsCommandService,
  type VendorsReadService,
  type VendorPortalReadService,
  type VendorPortalCommandService,
  type BillingReadService,
  type BillingCheckoutService,
  type BillingPortalService,
  type BillingSubscriptionCommandService,
  type ReportsReadService,
  type ReportsGenerateService,
  type ProfileReadService,
  type ProfileCommandService,
  type PortfolioInsightsReadService,
  type AdminOpsReadService,
  type AdminRentcastReadService,
  type AdminLenderReadService,
  type AdminAgentCrewReadService,
  type AdminAgentCrewCommandService,
  type AdminUserCommandService,
  type SessionResolverDeps,
  type SessionUserStore,
} from '@paperworking/services';
import {
  createIdentityUserRepository,
  createSessionUserStore,
  createAuthProfileAccess,
  createAuthzStore,
  createProjectsReadRepository,
  createProjectsCommandRepository,
  createProjectKpiReadRepository,
  createProjectDocumentsRepository,
  createPortfolioMetricsReadRepository,
  createPortfolioInsightsReadRepository,
  createDealsReadRepository,
  createDealsCommandRepository,
  createDealCommunicationRepository,
  createInboxReadRepository,
  createInboxCommandRepository,
  createTeamMembersReadRepository,
  createTeamCommandRepository,
  createMarketplaceProfileReadRepository,
  createMarketplaceInvestorsReadRepository,
  createMarketplaceFollowCommandRepository,
  createVendorsReadRepository,
  createVendorPortalReadRepository,
  createVendorPortalCommandRepository,
  createBillingSubscriptionRepository,
  createReportsReadRepository,
  createProfileSettingsRepository,
  createAdminReadRepository,
  createAdminCommandRepository,
  createReportPdfExportPort,
  createStripeBillingProvider,
  createFirebaseFileStorage,
  firebaseStorageHasCredentials,
  createUnavailableFileStorage,
  type FileStoragePort,
} from '@paperworking/database';
import {
  createDefaultIdentityDeps,
  type IdentityVerificationDeps,
} from '@paperworking/identity';

export type HandlerDeps = {
  health: HealthCheckDeps;
  identity: IdentityVerificationDeps;
  sessionStore: SessionUserStore;
  sessionResolver: SessionResolverDeps;
  authorization: AuthorizationService;
  authzStore: AuthzStore;
  validateCsrf: typeof authzValidateCsrf;
  resolveAuthUserFromCredentials: typeof resolveAuthUserFromCredentials;
};

let cachedDeps: HandlerDeps | null = null;
let cachedProjectsRead: ProjectsReadService | null = null;
let cachedProjectsCommand: ProjectsCommandService | null = null;
let cachedProjectKpiRead: ProjectKpiReadService | null = null;
let cachedInboxRead: InboxReadService | null = null;
let cachedInboxCommand: InboxCommandService | null = null;
let cachedPortfolioMetricsRead: PortfolioMetricsReadService | null = null;
let cachedTeamMembersRead: TeamMembersReadService | null = null;
let cachedTeamCommand: TeamCommandService | null = null;
let cachedMarketplaceProfileRead: MarketplaceProfileReadService | null = null;
let cachedMarketplaceInvestorsRead: MarketplaceInvestorsReadService | null = null;
let cachedMarketplaceFollowCommand: MarketplaceFollowCommandService | null = null;
let cachedVendorsRead: VendorsReadService | null = null;
let cachedVendorPortalRead: VendorPortalReadService | null = null;
let cachedVendorPortalCommand: VendorPortalCommandService | null = null;
let cachedDealsRead: DealsReadService | null = null;
let cachedDealsCommand: DealsCommandService | null = null;
let cachedDealBroadcast: DealBroadcastService | null = null;
let cachedDealReply: DealReplyService | null = null;
let cachedProjectDocumentsRead: ProjectDocumentsReadService | null = null;
let cachedProjectDocumentsCommand: ProjectDocumentsCommandService | null = null;
let cachedFileStorage: FileStoragePort | null = null;
let cachedBillingRead: BillingReadService | null = null;
let cachedBillingCheckout: BillingCheckoutService | null = null;
let cachedBillingPortal: BillingPortalService | null = null;
let cachedBillingSubscriptionCommand: BillingSubscriptionCommandService | null = null;
let cachedReportsRead: ReportsReadService | null = null;
let cachedReportsGenerate: ReportsGenerateService | null = null;
let cachedProfileRead: ProfileReadService | null = null;
let cachedProfileCommand: ProfileCommandService | null = null;
let cachedPortfolioInsightsRead: PortfolioInsightsReadService | null = null;
let cachedAdminOpsRead: AdminOpsReadService | null = null;
let cachedAdminRentcastRead: AdminRentcastReadService | null = null;
let cachedAdminLenderRead: AdminLenderReadService | null = null;
let cachedAdminAgentCrewRead: AdminAgentCrewReadService | null = null;
let cachedAdminAgentCrewCommand: AdminAgentCrewCommandService | null = null;
let cachedAdminUserCommand: AdminUserCommandService | null = null;

function buildHealthDeps(): HealthCheckDeps {
  return {
    breakers: circuitBreakers,
    environment: process.env.NODE_ENV ?? 'development',
    appName: 'PaperWorking (Next.js)',
  };
}

/**
 * Shared dependencies for Next.js API route adapters.
 *
 * Boundary rule (P2.9+): apps/web is a transport adapter — it must NOT depend on
 * Nest business logic. Temporary imports from `@paperworking/api` are limited to
 * framework-neutral HTTP handlers for already-migrated routes (auth, health).
 * Phase B+ migrations MUST wire Next routes → packages/services → authz → database,
 * not → Nest controllers/services or internal HTTP to Cloud Run.
 */
export function buildHandlerDeps(): HandlerDeps {
  if (!cachedDeps) {
    const identity = createDefaultIdentityDeps();
    const sessionStore = createSessionUserStore();
    const authzStore = createAuthzStore();

    cachedDeps = {
      health: buildHealthDeps(),
      identity,
      sessionStore,
      sessionResolver: { identity, store: sessionStore },
      authorization: new AuthorizationService(authzStore),
      authzStore,
      validateCsrf: authzValidateCsrf,
      resolveAuthUserFromCredentials,
    };
  }
  return cachedDeps;
}

/** Reset cached deps (tests only). */
export function resetHandlerDepsForTests(): void {
  cachedDeps = null;
  cachedProjectsRead = null;
  cachedProjectsCommand = null;
  cachedProjectKpiRead = null;
  cachedInboxRead = null;
  cachedInboxCommand = null;
  cachedPortfolioMetricsRead = null;
  cachedTeamMembersRead = null;
  cachedTeamCommand = null;
  cachedMarketplaceProfileRead = null;
  cachedMarketplaceInvestorsRead = null;
  cachedMarketplaceFollowCommand = null;
  cachedVendorsRead = null;
  cachedVendorPortalRead = null;
  cachedVendorPortalCommand = null;
  cachedDealsRead = null;
  cachedDealsCommand = null;
  cachedDealBroadcast = null;
  cachedDealReply = null;
  cachedProjectDocumentsRead = null;
  cachedProjectDocumentsCommand = null;
  cachedFileStorage = null;
  cachedBillingRead = null;
  cachedBillingCheckout = null;
  cachedBillingPortal = null;
  cachedBillingSubscriptionCommand = null;
  cachedReportsRead = null;
  cachedReportsGenerate = null;
  cachedProfileRead = null;
  cachedProfileCommand = null;
  cachedPortfolioInsightsRead = null;
  cachedAdminOpsRead = null;
  cachedAdminRentcastRead = null;
  cachedAdminLenderRead = null;
  cachedAdminAgentCrewRead = null;
  cachedAdminAgentCrewCommand = null;
  cachedAdminUserCommand = null;
}

/** Shared project read service for Next GET /api/projects* adapters (Phase B1). */
export function buildProjectsReadService(deps: HandlerDeps = buildHandlerDeps()): ProjectsReadService {
  if (!cachedProjectsRead) {
    cachedProjectsRead = createProjectsReadService({
      authz: deps.authorization,
      repository: createProjectsReadRepository(),
    });
  }
  return cachedProjectsRead;
}

/** Shared project command service for Next POST/PATCH /api/projects* (Phase B8). */
export function buildProjectsCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): ProjectsCommandService {
  if (!cachedProjectsCommand) {
    cachedProjectsCommand = createProjectsCommandService({
      authz: deps.authorization,
      repository: createProjectsCommandRepository(),
    });
  }
  return cachedProjectsCommand;
}

/** Shared project KPI read service for Next GET /api/projects/:id/kpis/current (Phase B9). */
export function buildProjectKpiReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): ProjectKpiReadService {
  if (!cachedProjectKpiRead) {
    cachedProjectKpiRead = createProjectKpiReadService({
      authz: deps.authorization,
      repository: createProjectKpiReadRepository(),
    });
  }
  return cachedProjectKpiRead;
}

/** Shared inbox read service for Next GET /api/inbox adapter (Phase B2). */
export function buildInboxReadService(deps: HandlerDeps = buildHandlerDeps()): InboxReadService {
  if (!cachedInboxRead) {
    cachedInboxRead = createInboxReadService({
      repository: createInboxReadRepository(),
    });
  }
  return cachedInboxRead;
}

/** Shared inbox command service for Next PATCH/DELETE /api/inbox/:id (Phase B6). */
export function buildInboxCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): InboxCommandService {
  if (!cachedInboxCommand) {
    cachedInboxCommand = createInboxCommandService({
      repository: createInboxCommandRepository(),
    });
  }
  return cachedInboxCommand;
}

/** Shared portfolio metrics read service for Next GET /api/portfolio/metrics (Phase B3). */
export function buildPortfolioMetricsReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): PortfolioMetricsReadService {
  if (!cachedPortfolioMetricsRead) {
    cachedPortfolioMetricsRead = createPortfolioMetricsReadService({
      authz: deps.authorization,
      repository: createPortfolioMetricsReadRepository(),
    });
  }
  return cachedPortfolioMetricsRead;
}

/** Shared team members read service for Next GET /api/team/members (Phase B4). */
export function buildTeamMembersReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): TeamMembersReadService {
  if (!cachedTeamMembersRead) {
    cachedTeamMembersRead = createTeamMembersReadService({
      authz: deps.authorization,
      repository: createTeamMembersReadRepository(),
    });
  }
  return cachedTeamMembersRead;
}

/** Shared team command service for Next team mutation routes (Phase B7). */
export function buildTeamCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): TeamCommandService {
  if (!cachedTeamCommand) {
    cachedTeamCommand = createTeamCommandService({
      authz: deps.authorization,
      repository: createTeamCommandRepository(),
    });
  }
  return cachedTeamCommand;
}

/** Shared marketplace profile read service for Next GET /api/marketplace/profile (Phase B5). */
export function buildMarketplaceProfileReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): MarketplaceProfileReadService {
  if (!cachedMarketplaceProfileRead) {
    cachedMarketplaceProfileRead = createMarketplaceProfileReadService({
      repository: createMarketplaceProfileReadRepository(),
    });
  }
  return cachedMarketplaceProfileRead;
}

/** Shared marketplace investors/listings read service (Phase B11). */
export function buildMarketplaceInvestorsReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): MarketplaceInvestorsReadService {
  if (!cachedMarketplaceInvestorsRead) {
    cachedMarketplaceInvestorsRead = createMarketplaceInvestorsReadService({
      repository: createMarketplaceInvestorsReadRepository(),
    });
  }
  return cachedMarketplaceInvestorsRead;
}

/** Shared marketplace follow command service (Phase B12). */
export function buildMarketplaceFollowCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): MarketplaceFollowCommandService {
  if (!cachedMarketplaceFollowCommand) {
    cachedMarketplaceFollowCommand = createMarketplaceFollowCommandService({
      repository: createMarketplaceFollowCommandRepository(),
    });
  }
  return cachedMarketplaceFollowCommand;
}

/** Shared vendors read service for Next GET /api/vendors (Phase B11). */
export function buildVendorsReadService(deps: HandlerDeps = buildHandlerDeps()): VendorsReadService {
  if (!cachedVendorsRead) {
    cachedVendorsRead = createVendorsReadService({
      authz: deps.authorization,
      repository: createVendorsReadRepository(),
    });
  }
  return cachedVendorsRead;
}

/** Shared vendor portal read service (Phase B11). */
export function buildVendorPortalReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): VendorPortalReadService {
  if (!cachedVendorPortalRead) {
    cachedVendorPortalRead = createVendorPortalReadService({
      repository: createVendorPortalReadRepository(),
    });
  }
  return cachedVendorPortalRead;
}

/** Shared vendor portal command service (Phase B12). */
export function buildVendorPortalCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): VendorPortalCommandService {
  if (!cachedVendorPortalCommand) {
    cachedVendorPortalCommand = createVendorPortalCommandService({
      authz: deps.authorization,
      repository: createVendorPortalCommandRepository(),
    });
  }
  return cachedVendorPortalCommand;
}

/** Shared deals read service for Next GET /api/deals* (Phase B10). */
export function buildDealsReadService(deps: HandlerDeps = buildHandlerDeps()): DealsReadService {
  if (!cachedDealsRead) {
    cachedDealsRead = createDealsReadService({
      authz: deps.authorization,
      repository: createDealsReadRepository(),
    });
  }
  return cachedDealsRead;
}

/** Shared deals command service for Next POST /api/deals (Phase B10). */
export function buildDealsCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): DealsCommandService {
  if (!cachedDealsCommand) {
    cachedDealsCommand = createDealsCommandService({
      authz: deps.authorization,
      repository: createDealsCommandRepository(),
    });
  }
  return cachedDealsCommand;
}

/** Shared deal broadcast service for Next POST /api/deals/broadcast (Phase B13). */
export function buildDealBroadcastService(
  deps: HandlerDeps = buildHandlerDeps(),
): DealBroadcastService {
  if (!cachedDealBroadcast) {
    cachedDealBroadcast = createDealBroadcastService({
      authz: deps.authorization,
      repository: createDealCommunicationRepository(),
    });
  }
  return cachedDealBroadcast;
}

/** Shared deal reply service for Next POST /api/deals/reply (Phase B13). */
export function buildDealReplyService(deps: HandlerDeps = buildHandlerDeps()): DealReplyService {
  if (!cachedDealReply) {
    cachedDealReply = createDealReplyService({
      authz: deps.authorization,
      repository: createDealCommunicationRepository(),
    });
  }
  return cachedDealReply;
}

function buildFileStoragePort(): FileStoragePort {
  if (!cachedFileStorage) {
    cachedFileStorage = firebaseStorageHasCredentials()
      ? createFirebaseFileStorage()
      : createUnavailableFileStorage('Firebase Storage is not configured for document uploads');
  }
  return cachedFileStorage;
}

/** Shared project documents read service for Next GET document routes (Phase B14). */
export function buildProjectDocumentsReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): ProjectDocumentsReadService {
  if (!cachedProjectDocumentsRead) {
    cachedProjectDocumentsRead = createProjectDocumentsReadService({
      authz: deps.authorization,
      repository: createProjectDocumentsRepository(),
      storage: buildFileStoragePort(),
    });
  }
  return cachedProjectDocumentsRead;
}

/** Shared project documents command service for Next POST upload routes (Phase B14). */
export function buildProjectDocumentsCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): ProjectDocumentsCommandService {
  if (!cachedProjectDocumentsCommand) {
    cachedProjectDocumentsCommand = createProjectDocumentsCommandService({
      authz: deps.authorization,
      repository: createProjectDocumentsRepository(),
      storage: buildFileStoragePort(),
    });
  }
  return cachedProjectDocumentsCommand;
}

function buildBillingRepository(_deps: HandlerDeps = buildHandlerDeps()) {
  return createBillingSubscriptionRepository();
}

function buildBillingProvider() {
  return createStripeBillingProvider();
}

/** Shared billing read service for Next GET /api/billing (Phase B15). */
export function buildBillingReadService(deps: HandlerDeps = buildHandlerDeps()): BillingReadService {
  if (!cachedBillingRead) {
    cachedBillingRead = createBillingReadService({
      repository: buildBillingRepository(deps),
    });
  }
  return cachedBillingRead;
}

/** Shared checkout service for Next POST /api/stripe/checkout (Phase B15). */
export function buildBillingCheckoutService(
  deps: HandlerDeps = buildHandlerDeps(),
): BillingCheckoutService {
  if (!cachedBillingCheckout) {
    cachedBillingCheckout = createBillingCheckoutService({
      provider: buildBillingProvider(),
      repository: buildBillingRepository(deps),
    });
  }
  return cachedBillingCheckout;
}

/** Shared portal service for Next POST /api/stripe/portal (Phase B15). */
export function buildBillingPortalService(
  deps: HandlerDeps = buildHandlerDeps(),
): BillingPortalService {
  if (!cachedBillingPortal) {
    cachedBillingPortal = createBillingPortalService({
      provider: buildBillingProvider(),
      repository: buildBillingRepository(deps),
    });
  }
  return cachedBillingPortal;
}

/** Shared subscription mutations for Next POST /api/billing/* (Phase B15). */
export function buildBillingSubscriptionCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): BillingSubscriptionCommandService {
  if (!cachedBillingSubscriptionCommand) {
    cachedBillingSubscriptionCommand = createBillingSubscriptionCommandService({
      authz: deps.authorization,
      provider: buildBillingProvider(),
      repository: buildBillingRepository(deps),
    });
  }
  return cachedBillingSubscriptionCommand;
}

/** Shared reports read service for Next GET /api/reports/* (Phase B16). */
export function buildReportsReadService(deps: HandlerDeps = buildHandlerDeps()): ReportsReadService {
  if (!cachedReportsRead) {
    cachedReportsRead = createReportsReadService({
      authz: deps.authorization,
      repository: createReportsReadRepository(),
    });
  }
  return cachedReportsRead;
}

/** Shared reports generate service for Next POST /api/reports/generate (Phase B16). */
export function buildReportsGenerateService(
  deps: HandlerDeps = buildHandlerDeps(),
): ReportsGenerateService {
  if (!cachedReportsGenerate) {
    cachedReportsGenerate = createReportsGenerateService({
      authz: deps.authorization,
      pdfExport: createReportPdfExportPort(),
      reportsRepository: createReportsReadRepository(),
      kpiRepository: createProjectKpiReadRepository(),
    });
  }
  return cachedReportsGenerate;
}

/** Shared profile read service for Next GET /api/settings/profile (Phase B17). */
export function buildProfileReadService(deps: HandlerDeps = buildHandlerDeps()): ProfileReadService {
  if (!cachedProfileRead) {
    cachedProfileRead = createProfileReadService({
      repository: createProfileSettingsRepository(),
    });
  }
  return cachedProfileRead;
}

/** Shared profile command service for Next PUT /api/settings/profile (Phase B17). */
export function buildProfileCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): ProfileCommandService {
  if (!cachedProfileCommand) {
    cachedProfileCommand = createProfileCommandService({
      repository: createProfileSettingsRepository(),
    });
  }
  return cachedProfileCommand;
}

/** Shared portfolio insights read service for Next GET /api/insights (Phase B17). */
export function buildPortfolioInsightsReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): PortfolioInsightsReadService {
  if (!cachedPortfolioInsightsRead) {
    cachedPortfolioInsightsRead = createPortfolioInsightsReadService({
      authz: deps.authorization,
      repository: createPortfolioInsightsReadRepository(),
    });
  }
  return cachedPortfolioInsightsRead;
}

function adminRepository(_deps: HandlerDeps = buildHandlerDeps()) {
  return createAdminReadRepository();
}

/** Shared admin ops read service for Next GET /api/admin/ops (Phase B18). */
export function buildAdminOpsReadService(deps: HandlerDeps = buildHandlerDeps()): AdminOpsReadService {
  if (!cachedAdminOpsRead) {
    cachedAdminOpsRead = createAdminOpsReadService({
      authz: deps.authorization,
      repository: adminRepository(deps),
    });
  }
  return cachedAdminOpsRead;
}

export function buildAdminRentcastReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): AdminRentcastReadService {
  if (!cachedAdminRentcastRead) {
    cachedAdminRentcastRead = createAdminRentcastReadService({
      authz: deps.authorization,
      repository: adminRepository(deps),
    });
  }
  return cachedAdminRentcastRead;
}

export function buildAdminLenderReadService(deps: HandlerDeps = buildHandlerDeps()): AdminLenderReadService {
  if (!cachedAdminLenderRead) {
    cachedAdminLenderRead = createAdminLenderReadService({
      authz: deps.authorization,
      repository: adminRepository(deps),
    });
  }
  return cachedAdminLenderRead;
}

export function buildAdminAgentCrewReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): AdminAgentCrewReadService {
  if (!cachedAdminAgentCrewRead) {
    cachedAdminAgentCrewRead = createAdminAgentCrewReadService({
      authz: deps.authorization,
      repository: adminRepository(deps),
    });
  }
  return cachedAdminAgentCrewRead;
}

export function buildAdminAgentCrewCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): AdminAgentCrewCommandService {
  if (!cachedAdminAgentCrewCommand) {
    cachedAdminAgentCrewCommand = createAdminAgentCrewCommandService({
      authz: deps.authorization,
      repository: adminRepository(deps),
    });
  }
  return cachedAdminAgentCrewCommand;
}

export function buildAdminUserCommandService(
  deps: HandlerDeps = buildHandlerDeps(),
): AdminUserCommandService {
  if (!cachedAdminUserCommand) {
    const commandRepository = createAdminCommandRepository();
    cachedAdminUserCommand = createAdminUserCommandService({
      authz: deps.authorization,
      readRepository: adminRepository(deps),
      commandRepository: {
        updateUserAccountType: (input) => commandRepository.updateUserAccountType(input),
        writeAuditLog: (input) => commandRepository.writeAuditLog(input),
      },
    });
  }
  return cachedAdminUserCommand;
}

/** Admin command repository (audit log, synthetic agent lookup) for privileged BFF routes. */
export function buildAdminCommandRepository(
  _deps: HandlerDeps = buildHandlerDeps(),
): ReturnType<typeof createAdminCommandRepository> {
  return createAdminCommandRepository();
}

/** Auth profile deps for GET /api/auth/me handler. */
export function buildAuthMeDeps(_deps: HandlerDeps = buildHandlerDeps()): AuthMeDeps {
  const profile = createAuthProfileAccess();
  return {
    findUser: profile.findUser,
    findSubscription: profile.findSubscription,
  };
}

/** Shared auth command services for Nest/Next session convergence (P1). */
export function buildSharedAuthServices(deps: HandlerDeps = buildHandlerDeps()) {
  const { identity, sessionStore } = deps;
  const repository = createIdentityUserRepository();
  const profile = createAuthProfileAccess();
  const identityProvisioning = createIdentityProvisioningService({
    repository,
    sessionStore,
  });
  const subscriptionLookup = {
    findForUserId: profile.findSubscriptionForUid,
  };

  return {
    identity,
    identityProvisioning,
    sessionCommand: sessionCommandService,
    subscriptionLookup,
  };
}

/** Firebase/Supabase session exchange for POST/DELETE /api/auth/session. */
export function buildSessionPostDeps(deps: HandlerDeps = buildHandlerDeps()): SessionPostDeps {
  const { identity } = deps;
  const firebase = identity.firebase;
  const shared = buildSharedAuthServices(deps);
  const profile = createAuthProfileAccess();

  return {
    hasCredentials: () => Boolean(firebase?.hasCredentials()),
    establishSharedSession: async ({ idToken, sessionId }) =>
      shared.sessionCommand.establishSession({
        accessToken: idToken,
        identity: shared.identity,
        identityProvisioning: shared.identityProvisioning,
        subscriptionLookup: shared.subscriptionLookup,
        policy: 'next',
        nodeEnv: process.env.NODE_ENV,
        sessionValueTransform: firebase?.hasCredentials()
          ? (token, expiresInMs) => firebase.createSessionCookie(token, expiresInMs)
          : undefined,
        sessionId,
      }),
    verifyIdToken: async (token) => {
      if (firebase?.hasCredentials()) {
        const verified = await firebase.verifyIdToken(token);
        return { uid: verified.uid };
      }
      throw new Error('Firebase Auth not configured');
    },
    createSessionCookie: firebase?.hasCredentials()
      ? (idToken, expiresInMs) => firebase.createSessionCookie(idToken, expiresInMs)
      : undefined,
    getUserProfile: async (uid) => {
      const subscription = await profile.findSubscriptionForUid(uid);
      return {
        subscriptionPlan: subscription?.plan ?? 'Individual',
        subscriptionStatus: subscription?.status ?? 'inactive',
        accountType: 'investor',
      };
    },
  };
}

export function buildSessionDeleteDeps(deps: HandlerDeps = buildHandlerDeps()): SessionDeleteDeps {
  const firebase = deps.identity.firebase;
  return {
    hasCredentials: () => Boolean(firebase?.hasCredentials()),
    verifySessionCookie: firebase?.hasCredentials()
      ? async (sessionCookie) => {
          const verified = await firebase.verifySessionCookie(sessionCookie);
          return { uid: verified.uid };
        }
      : undefined,
  };
}
