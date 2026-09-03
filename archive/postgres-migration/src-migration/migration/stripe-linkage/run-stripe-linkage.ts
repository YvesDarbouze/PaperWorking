import { FIRESTORE_COLLECTIONS } from '../../firestore/admin.js';
import { subscriptionFromFirestore } from '../../firestore/converters/subscription.converter.js';
import { documentData } from '../../firestore/repositories/firestore-access.js';
import { optionalString } from '../../firestore/converters/timestamp.js';
import {
  formatDiscoveryTable,
  formatLinkagePlanTable,
  planStripeLinkageRow,
  summarizeLinkagePlans,
} from './plan-stripe-linkage.js';
import { buildEmailIndex, resolveStripeIdentity } from './resolve-identity.js';
import { discoveryMetadataUid } from './stripe-read.js';
import type {
  AuthUserIndexEntry,
  FirestoreSubscriptionSnapshot,
  FirestoreUserBillingSnapshot,
  StripeDiscoveryRow,
  StripeLinkagePlanRow,
  StripeLinkageParityReport,
  StripeLinkageSummary,
  StripeSubscriptionSnapshot,
} from './types.js';

export type StripeLinkageDeps = {
  listAuthUsers: () => Promise<AuthUserIndexEntry[]>;
  listStripeSubscriptions: () => Promise<StripeSubscriptionSnapshot[]>;
  listStripeCustomers: () => Promise<Array<{ id: string; email: string | null }>>;
  getFirestoreSubscription: (uid: string) => Promise<FirestoreSubscriptionSnapshot | null>;
  listFirestoreUserBilling: () => Promise<FirestoreUserBillingSnapshot[]>;
  writeSubscriptionLinkage: (
    uid: string,
    subscriptionPayload: Record<string, unknown>,
    userSnapshotPayload: Record<string, unknown>,
  ) => Promise<void>;
  countFirestoreSubscriptions?: () => Promise<number>;
};

export type RunStripeLinkageOptions = {
  dryRun: boolean;
  deps: StripeLinkageDeps;
  logger?: (message: string) => void;
};

function defaultLogger(message: string): void {
  console.log(message);
}

function indexFirestoreBilling(users: FirestoreUserBillingSnapshot[]) {
  const byCustomer = new Map<string, string>();
  const bySubscription = new Map<string, string>();
  for (const user of users) {
    if (user.stripeCustomerId) byCustomer.set(user.stripeCustomerId, user.uid);
    if (user.stripeSubscriptionId) bySubscription.set(user.stripeSubscriptionId, user.uid);
  }
  return { byCustomer, bySubscription };
}

function subscriptionPriority(status: string): number {
  const order: Record<string, number> = {
    active: 5,
    trialing: 4,
    past_due: 3,
    incomplete: 2,
    canceled: 1,
    inactive: 0,
  };
  return order[status.toLowerCase()] ?? 0;
}

function pickAuthoritativeRows(rows: StripeLinkagePlanRow[]): StripeLinkagePlanRow[] {
  const byUid = new Map<string, StripeLinkagePlanRow[]>();
  const passthrough: StripeLinkagePlanRow[] = [];

  for (const row of rows) {
    if (!row.uid || row.proposedAction === 'skipped' || row.proposedAction === 'ambiguous') {
      passthrough.push(row);
      continue;
    }
    if (row.proposedAction === 'conflict') {
      passthrough.push(row);
      continue;
    }
    const list = byUid.get(row.uid) ?? [];
    list.push(row);
    byUid.set(row.uid, list);
  }

  const picked: StripeLinkagePlanRow[] = [...passthrough];

  for (const [uid, uidRows] of byUid) {
    if (uidRows.length === 1) {
      picked.push(uidRows[0]!);
      continue;
    }

    const sorted = [...uidRows].sort((a, b) => {
      const statusA = typeof a.payload?.status === 'string' ? a.payload.status : '';
      const statusB = typeof b.payload?.status === 'string' ? b.payload.status : '';
      const pri = subscriptionPriority(statusB) - subscriptionPriority(statusA);
      if (pri !== 0) return pri;

      const endA =
        a.payload?.currentPeriodEnd instanceof Date
          ? a.payload.currentPeriodEnd.getTime()
          : 0;
      const endB =
        b.payload?.currentPeriodEnd instanceof Date
          ? b.payload.currentPeriodEnd.getTime()
          : 0;
      if (endB !== endA) return endB - endA;

      return b.stripeSubscriptionId.localeCompare(a.stripeSubscriptionId);
    });

    const winner = sorted[0]!;
    picked.push(winner);

    for (const loser of sorted.slice(1)) {
      picked.push({
        ...loser,
        proposedAction: 'skipped',
        conflict: false,
        conflictReasons: [`superseded_by:${winner.stripeSubscriptionId}`],
        fieldsToWrite: [],
        payload: undefined,
        userSnapshotPayload: undefined,
      });
    }
  }

  return picked;
}

export async function buildStripeLinkagePlans(
  deps: StripeLinkageDeps,
): Promise<{
  discovery: StripeDiscoveryRow[];
  rows: StripeLinkagePlanRow[];
}> {
  const [authUsers, subscriptions, firestoreUsers] = await Promise.all([
    deps.listAuthUsers(),
    deps.listStripeSubscriptions(),
    deps.listFirestoreUserBilling(),
  ]);

  const authUids = new Set(authUsers.map((u) => u.uid));
  const { uniqueByEmail, ambiguousEmails } = buildEmailIndex(authUsers);
  const { byCustomer, bySubscription } = indexFirestoreBilling(firestoreUsers);

  const firestoreSubscriptionsByStripeSubscription = new Map<string, string>();
  for (const user of firestoreUsers) {
    if (user.stripeSubscriptionId) {
      firestoreSubscriptionsByStripeSubscription.set(user.stripeSubscriptionId, user.uid);
    }
  }

  const discovery: StripeDiscoveryRow[] = [];
  const rows: StripeLinkagePlanRow[] = [];

  for (const stripe of subscriptions) {
    const resolution = resolveStripeIdentity({
      subscriptionMetadata: stripe.metadata,
      customerMetadata: stripe.customer.metadata,
      customerEmail: stripe.customer.email,
      stripeCustomerId: stripe.customerId,
      stripeSubscriptionId: stripe.id,
      firestoreUsersByStripeCustomer: byCustomer,
      firestoreUsersByStripeSubscription: bySubscription,
      firestoreSubscriptionsByStripeSubscription,
      uniqueEmailToUid: uniqueByEmail,
      ambiguousEmails,
      authUids,
    });

    discovery.push({
      stripeCustomerId: stripe.customerId,
      stripeSubscriptionId: stripe.id,
      email: stripe.customer.email,
      metadataUid: discoveryMetadataUid(stripe),
      authUserMatch: resolution.uid,
      confidence: resolution.confidence,
      action: resolution.confidence === 'conflict' ? 'conflict' : resolution.uid ? 'link' : 'skip',
    });

    const existing = resolution.uid
      ? await deps.getFirestoreSubscription(resolution.uid)
      : null;

    rows.push(
      planStripeLinkageRow({
        uid: resolution.uid,
        email: stripe.customer.email,
        stripe,
        existing,
        confidence: resolution.confidence,
        conflictReasons: resolution.conflictReasons,
      }),
    );
  }

  return { discovery, rows: pickAuthoritativeRows(rows) };
}

export async function runStripeLinkage(
  options: RunStripeLinkageOptions,
): Promise<StripeLinkageSummary> {
  const log = options.logger ?? defaultLogger;
  const { discovery, rows } = await buildStripeLinkagePlans(options.deps);
  const counts = summarizeLinkagePlans(rows);

  log('=== STRIPE DISCOVERY ===');
  log(formatDiscoveryTable(discovery));
  log('');
  log('=== LINKAGE DRY-RUN PLAN ===');
  log(formatLinkagePlanTable(rows));
  log('');
  log(JSON.stringify({ dryRun: options.dryRun, counts }, null, 2));

  const conflictRows = rows.filter((r) => r.proposedAction === 'conflict');
  if (conflictRows.length > 0) {
    log('\nCONFLICTS:');
    for (const row of conflictRows) {
      log(`- ${row.stripeSubscriptionId}: ${row.conflictReasons.join('; ')}`);
    }
  }

  if (options.dryRun) {
    return { dryRun: true, discovery, rows, counts };
  }

  const executed = { created: 0, updated: 0, skipped: 0, failed: 0, conflicts: 0 };

  for (const row of rows) {
    if (
      row.proposedAction === 'no-op' ||
      row.proposedAction === 'skipped' ||
      row.proposedAction === 'ambiguous'
    ) {
      executed.skipped++;
      continue;
    }
    if (row.proposedAction === 'conflict') {
      executed.conflicts++;
      executed.skipped++;
      continue;
    }
    if (!row.uid || !row.payload || !row.userSnapshotPayload) {
      executed.skipped++;
      continue;
    }

    try {
      await options.deps.writeSubscriptionLinkage(
        row.uid,
        row.payload,
        row.userSnapshotPayload,
      );
      if (row.proposedAction === 'create') executed.created++;
      else executed.updated++;
      log(
        `[write] uid=${row.uid} action=${row.proposedAction} sub=${row.stripeSubscriptionId}`,
      );
    } catch (error) {
      executed.failed++;
      const message = error instanceof Error ? error.message : String(error);
      log(`[failed] uid=${row.uid}: ${message}`);
    }
  }

  log(JSON.stringify({ executed }, null, 2));
  return { dryRun: false, discovery, rows, counts, executed };
}

export async function verifyStripeLinkageParity(
  deps: StripeLinkageDeps,
): Promise<StripeLinkageParityReport> {
  const [customers, subscriptions, firestoreUsers] = await Promise.all([
    deps.listStripeCustomers(),
    deps.listStripeSubscriptions(),
    deps.listFirestoreUserBilling(),
  ]);

  const linkedUsers = firestoreUsers.filter(
    (u) => u.stripeCustomerId && u.stripeSubscriptionId,
  ).length;

  const stripeSubIds = new Set(subscriptions.map((s) => s.id));
  const linkedSubIds = new Set(
    firestoreUsers
      .map((u) => u.stripeSubscriptionId)
      .filter((id): id is string => Boolean(id)),
  );
  const missingStripeIds = [...stripeSubIds].filter((subId) => !linkedSubIds.has(subId));

  let firestoreSubscriptions = 0;
  if (deps.countFirestoreSubscriptions) {
    firestoreSubscriptions = await deps.countFirestoreSubscriptions();
  }

  return {
    stripeCustomers: customers.length,
    stripeSubscriptions: subscriptions.length,
    firestoreSubscriptions,
    linkedUsers,
    missingStripeIds,
  };
}

export { FIRESTORE_COLLECTIONS, subscriptionFromFirestore, documentData, optionalString };
