/**
 * Framework-independent application services extracted from Nest modules.
 */
export const SERVICES_PACKAGE_STATUS = 'phase-9a-shared-session' as const;

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
