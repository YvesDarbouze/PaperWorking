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
  createInboxReadService,
  createInboxCommandService,
  createPortfolioMetricsReadService,
  createTeamMembersReadService,
  createMarketplaceProfileReadService,
  createPrismaSessionUserStore,
  resolveAuthUserFromCredentials,
  sessionCommandService,
  type ProjectsReadService,
  type InboxReadService,
  type InboxCommandService,
  type PortfolioMetricsReadService,
  type TeamMembersReadService,
  type MarketplaceProfileReadService,
  type SessionResolverDeps,
  type SessionUserStore,
} from '@paperworking/services';
import {
  createPrismaAuthzStore,
  createPrismaIdentityUserRepository,
  createPrismaProjectsReadRepository,
  createPrismaInboxReadRepository,
  createPrismaInboxCommandRepository,
  createPrismaPortfolioMetricsReadRepository,
  createPrismaTeamMembersReadRepository,
  createPrismaMarketplaceProfileReadRepository,
  getApiPrismaClient,
  type ApiPrismaClient,
} from '@paperworking/database';
import {
  createDefaultIdentityDeps,
  isFirebaseAuthEnabled,
  type IdentityVerificationDeps,
} from '@paperworking/identity';

export type HandlerDeps = {
  health: HealthCheckDeps;
  prisma: ApiPrismaClient;
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
let cachedInboxRead: InboxReadService | null = null;
let cachedInboxCommand: InboxCommandService | null = null;
let cachedPortfolioMetricsRead: PortfolioMetricsReadService | null = null;
let cachedTeamMembersRead: TeamMembersReadService | null = null;
let cachedMarketplaceProfileRead: MarketplaceProfileReadService | null = null;

function buildHealthDeps(): HealthCheckDeps {
  const pingPostgres = async () => {
    const client = requirePrismaClient();
    await client.$queryRaw`SELECT 1`;
  };

  return {
    pingPostgres: process.env.DATABASE_URL ? pingPostgres : undefined,
    breakers: circuitBreakers,
    environment: process.env.NODE_ENV ?? 'development',
    appName: 'PaperWorking (Next.js)',
  };
}

function requirePrismaClient(): ApiPrismaClient {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set — required for @paperworking/database client');
  }
  return getApiPrismaClient();
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
    const prisma = requirePrismaClient();
    const identity = createDefaultIdentityDeps();
    const sessionStore = createPrismaSessionUserStore(prisma);
    const authzStore = createPrismaAuthzStore(prisma);

    cachedDeps = {
      health: buildHealthDeps(),
      prisma,
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
  cachedInboxRead = null;
  cachedInboxCommand = null;
  cachedPortfolioMetricsRead = null;
  cachedTeamMembersRead = null;
  cachedMarketplaceProfileRead = null;
}

/** Shared project read service for Next GET /api/projects* adapters (Phase B1). */
export function buildProjectsReadService(deps: HandlerDeps = buildHandlerDeps()): ProjectsReadService {
  if (!cachedProjectsRead) {
    cachedProjectsRead = createProjectsReadService({
      authz: deps.authorization,
      repository: createPrismaProjectsReadRepository(deps.prisma),
    });
  }
  return cachedProjectsRead;
}

/** Shared inbox read service for Next GET /api/inbox adapter (Phase B2). */
export function buildInboxReadService(deps: HandlerDeps = buildHandlerDeps()): InboxReadService {
  if (!cachedInboxRead) {
    cachedInboxRead = createInboxReadService({
      repository: createPrismaInboxReadRepository(deps.prisma),
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
      repository: createPrismaInboxCommandRepository(deps.prisma),
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
      repository: createPrismaPortfolioMetricsReadRepository(deps.prisma),
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
      repository: createPrismaTeamMembersReadRepository(deps.prisma),
    });
  }
  return cachedTeamMembersRead;
}

/** Shared marketplace profile read service for Next GET /api/marketplace/profile (Phase B5). */
export function buildMarketplaceProfileReadService(
  deps: HandlerDeps = buildHandlerDeps(),
): MarketplaceProfileReadService {
  if (!cachedMarketplaceProfileRead) {
    cachedMarketplaceProfileRead = createMarketplaceProfileReadService({
      repository: createPrismaMarketplaceProfileReadRepository(deps.prisma),
    });
  }
  return cachedMarketplaceProfileRead;
}

/** Prisma-backed deps for GET /api/auth/me handler. */
export function buildAuthMeDeps(deps: HandlerDeps = buildHandlerDeps()): AuthMeDeps {
  const { prisma } = deps;
  return {
    findUser: (uid) =>
      prisma.user.findFirst({
        where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
      }),
    findSubscription: (userId) =>
      prisma.subscription.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
  };
}

/** Shared auth command services for Nest/Next session convergence (P1). */
export function buildSharedAuthServices(deps: HandlerDeps = buildHandlerDeps()) {
  const { prisma, identity, sessionStore } = deps;
  const repository = createPrismaIdentityUserRepository(prisma);
  const identityProvisioning = createIdentityProvisioningService({
    repository,
    sessionStore,
  });
  const subscriptionLookup = {
    findForUserId: async (userId: string) => {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: userId }, { legacyFirebaseUid: userId }] },
      });
      const subscription = user
        ? await prisma.subscription.findFirst({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
          })
        : null;
      return subscription ? { plan: subscription.plan, status: subscription.status } : null;
    },
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
  const { prisma, identity } = deps;
  const firebase = identity.firebase;
  const supabase = identity.supabase;
  const shared = buildSharedAuthServices(deps);

  return {
    hasCredentials: () =>
      Boolean(
        firebase?.hasCredentials() ||
          supabase?.hasCredentials() ||
          process.env.FIREBASE_CLIENT_EMAIL,
      ),
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
      if (isFirebaseAuthEnabled() && firebase?.hasCredentials()) {
        const verified = await firebase.verifyIdToken(token);
        return { uid: verified.uid };
      }
      if (supabase?.hasCredentials()) {
        const verified = await supabase.verifyAccessToken(token);
        return { uid: verified.uid };
      }
      if (firebase?.hasCredentials()) {
        const verified = await firebase.verifyIdToken(token);
        return { uid: verified.uid };
      }
      throw new Error('No identity provider configured');
    },
    createSessionCookie: firebase?.hasCredentials()
      ? (idToken, expiresInMs) => firebase.createSessionCookie(idToken, expiresInMs)
      : undefined,
    getUserProfile: async (uid) => {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: uid }, { legacyFirebaseUid: uid }] },
      });
      const subscription = user
        ? await prisma.subscription.findFirst({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
          })
        : null;
      return {
        subscriptionPlan: subscription?.plan ?? 'Individual',
        subscriptionStatus: subscription?.status ?? 'inactive',
        accountType: user?.accountType ?? 'investor',
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
