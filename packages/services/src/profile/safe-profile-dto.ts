import type { AuthUser } from '@paperworking/authz';
import type { ProfileUserRow } from './profile-settings-repository.js';

/** Browser-facing profile fields — explicit allowlist (Phase B17.1). */
export type SafeProfileDto = {
  email: string;
  name: string | null;
  displayName: string | null;
  phone: string | null;
  timezone: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  /** Postgres-derived account tier label; read-only in profile PUT. */
  accountType: string | null;
};

/** Internal User columns that must never appear in profile HTTP responses. */
export const INTERNAL_PROFILE_RESPONSE_FIELDS = [
  'role',
  'isAdmin',
  'permissions',
  'legacyFirebaseUid',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'subscriptionStatus',
  'subscriptionPlan',
  'organizationId',
  'orgId',
  'settings',
  'passwordHash',
  'providerTokens',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'userId',
  'uid',
] as const;

/**
 * Maps a Postgres User row to the browser-safe profile DTO.
 * Never spreads nested settings JSON or raw Prisma columns.
 */
export function mapUserRowToSafeProfileDto(
  row: ProfileUserRow | null,
  user: AuthUser,
): SafeProfileDto {
  return {
    email: row?.email || user.email || '',
    name: row?.name ?? null,
    displayName: row?.displayName ?? null,
    phone: row?.phone ?? null,
    timezone: row?.timezone ?? null,
    companyName: row?.companyName ?? null,
    avatarUrl: row?.avatarUrl ?? null,
    accountType: row?.accountType || user.accountType || null,
  };
}
