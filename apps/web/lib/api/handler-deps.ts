import type { HealthCheckDeps, AuthMeDeps } from '@paperworking/api';
import { circuitBreakers } from '@paperworking/api';
import {
  AuthorizationService,
  validateCsrf as authzValidateCsrf,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  getApiPrismaClient,
  type ApiPrismaClient,
} from '@paperworking/database';
import {
  createDefaultIdentityDeps,
  type IdentityVerificationDeps,
} from '@paperworking/identity';
import {
  createPrismaSessionUserStore,
  resolveAuthUserFromCredentials,
  type SessionResolverDeps,
  type SessionUserStore,
} from '@paperworking/services';

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

/** Shared dependencies for Next.js API route adapters. */
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
