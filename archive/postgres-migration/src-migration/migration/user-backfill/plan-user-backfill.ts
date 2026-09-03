import type {
  AuthUserSnapshot,
  FirestoreUserDoc,
  PostgresUserSnapshot,
  ProposedAction,
  UserBackfillPlanRow,
  UserBackfillSummary,
} from './types.js';
import { normalizeEmail, resolvePostgresMatch, type PostgresMatchResult } from './resolve-postgres.js';
import {
  collectSecurityReviews,
  safeAccountTypeForCreate,
  safeRoleForFill,
} from './reconcile-security.js';

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function pickString(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (!isEmpty(value)) return value!.trim();
  }
  return undefined;
}

function resolveCreatedAt(
  auth: AuthUserSnapshot,
  postgres?: PostgresUserSnapshot | null,
): Date | undefined {
  return postgres?.createdAt ?? auth.createdAt ?? undefined;
}

export function buildCreatePayload(input: {
  auth: AuthUserSnapshot;
  postgres?: PostgresUserSnapshot | null;
}): Record<string, unknown> {
  const { auth, postgres } = input;
  const email =
    normalizeEmail(auth.email) ??
    normalizeEmail(postgres?.email) ??
    '';
  const displayName = pickString(auth.displayName, postgres?.displayName, postgres?.name);
  const payload: Record<string, unknown> = {
    uid: auth.uid,
    email,
    accountType: safeAccountTypeForCreate(postgres),
    role: safeRoleForFill(undefined, postgres) ?? null,
    legacyFirebaseUid: postgres?.legacyFirebaseUid ?? auth.uid,
    subscriptionPlan: 'Individual',
    subscriptionStatus: 'inactive',
  };

  if (displayName) {
    payload.displayName = displayName;
    payload.name = displayName;
  }
  const phone = pickString(auth.phoneNumber, postgres?.phone);
  if (phone) payload.phone = phone;
  const timezone = postgres?.timezone;
  if (timezone) payload.timezone = timezone;
  const companyName = postgres?.companyName;
  if (companyName) payload.companyName = companyName;
  const avatar = pickString(auth.photoURL, postgres?.avatarUrl);
  if (avatar) {
    payload.avatarUrl = avatar;
    payload.photoURL = avatar;
  }
  if (postgres?.syntheticAgent) {
    payload.syntheticAgent = true;
  }

  const createdAt = resolveCreatedAt(auth, postgres);
  if (createdAt) {
    payload.createdAt = createdAt;
    payload.updatedAt = postgres?.updatedAt ?? createdAt;
  }

  return payload;
}

export function buildFillMissingPayload(input: {
  existing: FirestoreUserDoc;
  auth: AuthUserSnapshot;
  postgres?: PostgresUserSnapshot | null;
}): { payload: Record<string, unknown>; fields: string[] } {
  const { existing, auth, postgres } = input;
  const payload: Record<string, unknown> = {};
  const fields: string[] = [];

  const maybeSet = (field: string, value: unknown) => {
    if (isEmpty(value)) return;
    if (!isEmpty(existing[field])) return;
    payload[field] = value;
    fields.push(field);
  };

  maybeSet('email', normalizeEmail(auth.email) ?? normalizeEmail(postgres?.email));
  const displayName = pickString(auth.displayName, postgres?.displayName, postgres?.name);
  maybeSet('displayName', displayName);
  maybeSet('name', displayName);
  maybeSet('phone', pickString(auth.phoneNumber, postgres?.phone));
  maybeSet('timezone', postgres?.timezone);
  maybeSet('companyName', postgres?.companyName);
  const avatar = pickString(auth.photoURL, postgres?.avatarUrl);
  if (avatar) {
    maybeSet('avatarUrl', avatar);
    maybeSet('photoURL', avatar);
  }
  maybeSet('uid', auth.uid);

  if (isEmpty(existing.legacyFirebaseUid)) {
    const legacy = postgres?.legacyFirebaseUid ?? auth.uid;
    if (legacy) {
      payload.legacyFirebaseUid = legacy;
      fields.push('legacyFirebaseUid');
    }
  }

  const role = safeRoleForFill(existing.role, postgres);
  if (role !== undefined) {
    payload.role = role;
    fields.push('role');
  }

  if (fields.length > 0) {
    payload.updatedAt = postgres?.updatedAt ?? new Date();
  }

  return { payload, fields };
}

function postgresMatchLabel(match: PostgresMatchResult): UserBackfillPlanRow['postgresMatch'] {
  switch (match.kind) {
    case 'by_uid':
      return 'by_uid';
    case 'by_legacy_uid':
      return 'by_legacy_uid';
    case 'by_email':
      return 'by_email';
    default:
      return 'none';
  }
}

export function planUserBackfill(input: {
  auth: AuthUserSnapshot;
  existingFirestore: FirestoreUserDoc | null;
  postgresIndex: ReturnType<typeof import('./resolve-postgres.js').indexPostgresUsers>;
}): UserBackfillPlanRow {
  const { auth, existingFirestore } = input;
  if (auth.disabled) {
    return {
      uid: auth.uid,
      email: auth.email,
      firestoreExists: Boolean(existingFirestore),
      postgresMatch: 'none',
      authFallback: false,
      proposedAction: 'skipped',
      conflict: false,
      conflictReasons: ['auth_user_disabled'],
      securityReviews: [],
      fieldsToWrite: [],
    };
  }

  const pgMatch = resolvePostgresMatch(auth, input.postgresIndex);
  const postgresUser =
    pgMatch.kind === 'by_uid' ||
    pgMatch.kind === 'by_legacy_uid' ||
    pgMatch.kind === 'by_email'
      ? pgMatch.user
      : pgMatch.kind === 'email_uid_conflict'
        ? pgMatch.user
        : null;

  const securityReviews = collectSecurityReviews({
    firestore: existingFirestore,
    postgres: postgresUser,
  });

  if (pgMatch.kind === 'ambiguous_email') {
    return {
      uid: auth.uid,
      email: auth.email,
      firestoreExists: Boolean(existingFirestore),
      postgresMatch: 'none',
      authFallback: false,
      proposedAction: 'ambiguous',
      conflict: true,
      conflictReasons: [`ambiguous_email:${pgMatch.candidates.length}_candidates`],
      securityReviews,
      fieldsToWrite: [],
    };
  }

  if (pgMatch.kind === 'email_uid_conflict') {
    return {
      uid: auth.uid,
      email: auth.email,
      firestoreExists: Boolean(existingFirestore),
      postgresMatch: 'by_email',
      authFallback: false,
      proposedAction: 'conflict',
      conflict: true,
      conflictReasons: [
        `email_uid_mismatch:postgres_id=${pgMatch.user.id}`,
      ],
      securityReviews,
      fieldsToWrite: [],
    };
  }

  const postgresMatch = postgresMatchLabel(pgMatch);
  const authFallback = pgMatch.kind === 'none';

  if (existingFirestore) {
    const { payload, fields } = buildFillMissingPayload({
      existing: existingFirestore,
      auth,
      postgres: postgresUser,
    });
    if (fields.length === 0) {
      return {
        uid: auth.uid,
        email: auth.email,
        firestoreExists: true,
        postgresMatch,
        authFallback,
        proposedAction: 'no-op',
        conflict: false,
        conflictReasons: [],
        securityReviews,
        fieldsToWrite: [],
      };
    }
    return {
      uid: auth.uid,
      email: auth.email,
      firestoreExists: true,
      postgresMatch,
      authFallback,
      proposedAction: 'fill-missing',
      conflict: false,
      conflictReasons: [],
      securityReviews,
      fieldsToWrite: fields,
      payload,
    };
  }

  const payload = buildCreatePayload({ auth, postgres: postgresUser });
  return {
    uid: auth.uid,
    email: auth.email,
    firestoreExists: false,
    postgresMatch,
    authFallback,
    proposedAction: 'create',
    conflict: false,
    conflictReasons: [],
    securityReviews,
    fieldsToWrite: Object.keys(payload),
    payload,
  };
}

export function summarizePlans(rows: UserBackfillPlanRow[]): UserBackfillSummary['counts'] {
  const counts = {
    existing: 0,
    create: 0,
    fillMissing: 0,
    noOp: 0,
    conflict: 0,
    ambiguous: 0,
    skipped: 0,
    securityReview: 0,
  };

  for (const row of rows) {
    if (row.securityReviews.length > 0) counts.securityReview++;
    switch (row.proposedAction) {
      case 'create':
        counts.create++;
        break;
      case 'fill-missing':
        counts.fillMissing++;
        break;
      case 'no-op':
        counts.noOp++;
        if (row.firestoreExists) counts.existing++;
        break;
      case 'conflict':
        counts.conflict++;
        break;
      case 'ambiguous':
        counts.ambiguous++;
        break;
      case 'skipped':
        counts.skipped++;
        break;
      default:
        break;
    }
    if (row.firestoreExists && row.proposedAction !== 'no-op') {
      counts.existing++;
    }
  }

  return counts;
}

export function formatPlanTable(rows: UserBackfillPlanRow[]): string {
  const header =
    '| UID | Email | Firestore exists? | Postgres match? | Auth fallback? | Proposed action | Conflict? |';
  const sep =
    '|-----|-------|-------------------|-----------------|----------------|-----------------|-----------|';
  const lines = rows.map((row) => {
    const uid = row.uid.slice(0, 12);
    const email = (row.email ?? '').slice(0, 28);
    return `| ${uid} | ${email} | ${row.firestoreExists ? 'yes' : 'no'} | ${row.postgresMatch} | ${row.authFallback ? 'yes' : 'no'} | ${row.proposedAction} | ${row.conflict ? 'yes' : 'no'} |`;
  });
  return [header, sep, ...lines].join('\n');
}
