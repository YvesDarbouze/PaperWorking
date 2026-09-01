import type { HealthCheckDeps, AuthMeDeps, SessionPostDeps, SessionDeleteDeps } from '@paperworking/api';
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
  isFirebaseAuthEnabled,
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

/** Firebase/Supabase session exchange for POST/DELETE /api/auth/session. */
export function buildSessionPostDeps(deps: HandlerDeps = buildHandlerDeps()): SessionPostDeps {
  const { prisma, identity } = deps;
  const firebase = identity.firebase;
  const supabase = identity.supabase;

  return {
    hasCredentials: () =>
      Boolean(
        firebase?.hasCredentials() ||
          supabase?.hasCredentials() ||
          process.env.FIREBASE_CLIENT_EMAIL,
      ),
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
