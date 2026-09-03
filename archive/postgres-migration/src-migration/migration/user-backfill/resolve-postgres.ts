import type { AuthUserSnapshot, PostgresUserSnapshot } from './types.js';

export type PostgresMatchResult =
  | { kind: 'by_uid'; user: PostgresUserSnapshot }
  | { kind: 'by_legacy_uid'; user: PostgresUserSnapshot }
  | { kind: 'by_email'; user: PostgresUserSnapshot }
  | { kind: 'none' }
  | { kind: 'ambiguous_email'; candidates: PostgresUserSnapshot[] }
  | { kind: 'email_uid_conflict'; user: PostgresUserSnapshot };

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

export function indexPostgresUsers(users: PostgresUserSnapshot[]): {
  byId: Map<string, PostgresUserSnapshot>;
  byLegacyUid: Map<string, PostgresUserSnapshot>;
  byEmail: Map<string, PostgresUserSnapshot[]>;
} {
  const byId = new Map<string, PostgresUserSnapshot>();
  const byLegacyUid = new Map<string, PostgresUserSnapshot>();
  const byEmail = new Map<string, PostgresUserSnapshot[]>();

  for (const user of users) {
    byId.set(user.id, user);
    if (user.legacyFirebaseUid) {
      byLegacyUid.set(user.legacyFirebaseUid, user);
    }
    const email = normalizeEmail(user.email);
    if (email) {
      const list = byEmail.get(email) ?? [];
      list.push(user);
      byEmail.set(email, list);
    }
  }

  return { byId, byLegacyUid, byEmail };
}

/** Resolve Postgres profile for a Firebase Auth user (priority: uid → legacy → unambiguous email). */
export function resolvePostgresMatch(
  auth: AuthUserSnapshot,
  index: ReturnType<typeof indexPostgresUsers>,
): PostgresMatchResult {
  const byUid = index.byId.get(auth.uid);
  if (byUid) {
    return { kind: 'by_uid', user: byUid };
  }

  const byLegacy = index.byLegacyUid.get(auth.uid);
  if (byLegacy) {
    return { kind: 'by_legacy_uid', user: byLegacy };
  }

  const email = normalizeEmail(auth.email);
  if (!email) {
    return { kind: 'none' };
  }

  const candidates = index.byEmail.get(email) ?? [];
  if (candidates.length === 0) {
    return { kind: 'none' };
  }
  if (candidates.length > 1) {
    return { kind: 'ambiguous_email', candidates };
  }

  const match = candidates[0]!;
  if (match.id !== auth.uid) {
    return { kind: 'email_uid_conflict', user: match };
  }

  return { kind: 'by_email', user: match };
}
