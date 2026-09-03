import { FIRESTORE_COLLECTIONS } from '../../firestore/admin.js';
import { documentData } from '../../firestore/repositories/firestore-access.js';
import type {
  AuthUserSnapshot,
  PostgresUserSnapshot,
  UserBackfillPlanRow,
  UserBackfillSummary,
  UserParityReport,
} from './types.js';
import { indexPostgresUsers } from './resolve-postgres.js';
import {
  formatPlanTable,
  planUserBackfill,
  summarizePlans,
} from './plan-user-backfill.js';

export type UserBackfillDeps = {
  listAuthUsers: () => Promise<AuthUserSnapshot[]>;
  listPostgresUsers: () => Promise<PostgresUserSnapshot[]>;
  getFirestoreUser: (uid: string) => Promise<Record<string, unknown> | null>;
  writeFirestoreUser: (
    uid: string,
    payload: Record<string, unknown>,
    mode: 'create' | 'merge',
  ) => Promise<void>;
  countFirestoreUsers?: () => Promise<number>;
};

export type RunUserBackfillOptions = {
  dryRun: boolean;
  deps: UserBackfillDeps;
  logger?: (message: string) => void;
};

function defaultLogger(message: string): void {
  console.log(message);
}

export async function buildUserBackfillPlans(deps: UserBackfillDeps): Promise<UserBackfillPlanRow[]> {
  const [authUsers, postgresUsers] = await Promise.all([
    deps.listAuthUsers(),
    deps.listPostgresUsers(),
  ]);
  const postgresIndex = indexPostgresUsers(postgresUsers);
  const rows: UserBackfillPlanRow[] = [];

  for (const auth of authUsers) {
    const existing = await deps.getFirestoreUser(auth.uid);
    rows.push(
      planUserBackfill({
        auth,
        existingFirestore: existing,
        postgresIndex,
      }),
    );
  }

  return rows;
}

export async function runUserBackfill(options: RunUserBackfillOptions): Promise<UserBackfillSummary> {
  const log = options.logger ?? defaultLogger;
  const rows = await buildUserBackfillPlans(options.deps);
  const counts = summarizePlans(rows);

  log(formatPlanTable(rows));
  log('');
  log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        counts,
      },
      null,
      2,
    ),
  );

  const securityRows = rows.filter((r) => r.securityReviews.length > 0);
  if (securityRows.length > 0) {
    log('\nSECURITY REVIEW REQUIRED:');
    for (const row of securityRows) {
      log(`- ${row.uid} (${row.email ?? 'no-email'}): ${row.securityReviews.join(', ')}`);
    }
  }

  const conflictRows = rows.filter((r) => r.conflict);
  if (conflictRows.length > 0) {
    log('\nCONFLICTS:');
    for (const row of conflictRows) {
      log(`- ${row.uid}: ${row.conflictReasons.join('; ')}`);
    }
  }

  if (options.dryRun) {
    return { dryRun: true, rows, counts };
  }

  const executed = { migrated: 0, skipped: 0, failed: 0, conflicts: 0 };

  for (const row of rows) {
    if (row.proposedAction === 'no-op' || row.proposedAction === 'skipped') {
      executed.skipped++;
      continue;
    }
    if (row.proposedAction === 'conflict' || row.proposedAction === 'ambiguous') {
      executed.conflicts++;
      executed.skipped++;
      continue;
    }
    if (!row.payload || row.fieldsToWrite.length === 0) {
      executed.skipped++;
      continue;
    }

    try {
      const mode = row.proposedAction === 'create' ? 'create' : 'merge';
      await options.deps.writeFirestoreUser(row.uid, row.payload, mode);
      executed.migrated++;
      log(`[write] ${row.uid} ${row.proposedAction} fields=${row.fieldsToWrite.join(',')}`);
    } catch (error) {
      executed.failed++;
      const message = error instanceof Error ? error.message : String(error);
      log(`[failed] ${row.uid}: ${message}`);
    }
  }

  log(JSON.stringify({ executed }, null, 2));
  return { dryRun: false, rows, counts, executed };
}

export async function verifyUserParity(deps: UserBackfillDeps): Promise<UserParityReport> {
  const [authUsers, postgresUsers] = await Promise.all([
    deps.listAuthUsers(),
    deps.listPostgresUsers(),
  ]);
  const postgresIndex = indexPostgresUsers(postgresUsers);
  const authUids = new Set(authUsers.map((u) => u.uid));

  const missingFirestoreDoc: string[] = [];
  const emailMismatches: UserParityReport['emailMismatches'] = [];
  const privilegeConflicts: UserParityReport['privilegeConflicts'] = [];

  for (const auth of authUsers) {
    const existing = await deps.getFirestoreUser(auth.uid);
    if (!existing) {
      missingFirestoreDoc.push(auth.uid);
      continue;
    }
    const fsEmail = typeof existing.email === 'string' ? existing.email : null;
    if (
      auth.email &&
      fsEmail &&
      auth.email.trim().toLowerCase() !== fsEmail.trim().toLowerCase()
    ) {
      emailMismatches.push({ uid: auth.uid, authEmail: auth.email, firestoreEmail: fsEmail });
    }
    const plan = planUserBackfill({
      auth,
      existingFirestore: existing,
      postgresIndex,
    });
    if (plan.securityReviews.length > 0) {
      privilegeConflicts.push({ uid: auth.uid, reasons: plan.securityReviews });
    }
  }

  let firestoreUsers = 0;
  if (deps.countFirestoreUsers) {
    firestoreUsers = await deps.countFirestoreUsers();
  }

  const extraFirestoreDocs: string[] = [];
  if (firestoreUsers > 0 && deps.countFirestoreUsers) {
    // Extra docs (Firestore-only) are reported when count exceeds auth-matched set size.
    const matched = authUsers.length - missingFirestoreDoc.length;
    if (firestoreUsers > matched) {
      extraFirestoreDocs.push(`(+${firestoreUsers - matched} Firestore-only user docs — inspect manually)`);
    }
  }

  return {
    authUsers: authUsers.length,
    firestoreUsers,
    missingFirestoreDoc,
    extraFirestoreDocs,
    emailMismatches,
    privilegeConflicts,
  };
}

export { FIRESTORE_COLLECTIONS };
