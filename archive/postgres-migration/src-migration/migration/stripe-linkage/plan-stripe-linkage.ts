import type {
  FirestoreSubscriptionSnapshot,
  StripeLinkagePlanRow,
  StripeSubscriptionSnapshot,
} from './types.js';
import {
  mapStripeSubscriptionStatusForPersistence,
  resolvePlanFromStripePriceId,
} from './stripe-field-map.js';

function epochSecondsToDate(seconds: number | null): Date | null {
  if (seconds === null || seconds === undefined) return null;
  return new Date(seconds * 1000);
}

export function buildSubscriptionLinkagePayload(input: {
  uid: string;
  stripe: StripeSubscriptionSnapshot;
  existing: FirestoreSubscriptionSnapshot | null;
}): {
  payload: Record<string, unknown>;
  userSnapshotPayload: Record<string, unknown>;
  fieldsToWrite: string[];
  unresolvedPlan: boolean;
} {
  const { uid, stripe, existing } = input;
  const planMapping = stripe.priceId ? resolvePlanFromStripePriceId(stripe.priceId) : null;
  const planFromMeta = stripe.metadata.plan?.trim();
  const resolvedPlan =
    planMapping?.canonicalName ??
    (planFromMeta || null) ??
    existing?.plan ??
    null;
  const unresolvedPlan = !resolvedPlan && Boolean(stripe.priceId);

  const mappedStatus = mapStripeSubscriptionStatusForPersistence(stripe.status, {
    existingStatus: existing?.status ?? null,
  });
  const preserveStatus =
    existing?.status &&
    existing.stripeSubscriptionId === stripe.id &&
    existing.status !== mappedStatus &&
    existing.status !== 'inactive';

  const status = preserveStatus ? existing!.status! : mappedStatus;

  const payload: Record<string, unknown> = {
    id: uid,
    userId: uid,
    stripeCustomerId: stripe.customerId,
    stripeSubscriptionId: stripe.id,
    status,
    updatedAt: new Date(),
  };

  const fieldsToWrite = ['stripeCustomerId', 'stripeSubscriptionId', 'status', 'updatedAt'];

  if (resolvedPlan) {
    payload.plan = resolvedPlan;
    fieldsToWrite.push('plan');
  }
  if (stripe.priceId) {
    payload.stripePriceId = stripe.priceId;
    fieldsToWrite.push('stripePriceId');
  }
  if (stripe.cancelAtPeriodEnd !== undefined) {
    payload.cancelAtPeriodEnd = stripe.cancelAtPeriodEnd;
    fieldsToWrite.push('cancelAtPeriodEnd');
  }
  const periodStart = epochSecondsToDate(stripe.currentPeriodStart);
  if (periodStart) {
    payload.currentPeriodStart = periodStart;
    fieldsToWrite.push('currentPeriodStart');
  }
  const periodEnd = epochSecondsToDate(stripe.currentPeriodEnd);
  if (periodEnd) {
    payload.currentPeriodEnd = periodEnd;
    fieldsToWrite.push('currentPeriodEnd');
  }
  const trialEnd = epochSecondsToDate(stripe.trialEnd);
  if (trialEnd) {
    payload.trialEnd = trialEnd;
    fieldsToWrite.push('trialEnd');
  }

  if (!existing) {
    payload.createdAt = new Date();
    fieldsToWrite.push('createdAt');
  }

  const userSnapshotPayload: Record<string, unknown> = {
    stripeCustomerId: stripe.customerId,
    stripeSubscriptionId: stripe.id,
    subscriptionStatus: status,
    updatedAt: new Date(),
  };
  if (resolvedPlan) {
    userSnapshotPayload.subscriptionPlan = resolvedPlan;
  }
  if (stripe.cancelAtPeriodEnd !== undefined) {
    userSnapshotPayload.cancelAtPeriodEnd = stripe.cancelAtPeriodEnd;
  }
  if (periodEnd) {
    userSnapshotPayload.currentPeriodEnd = periodEnd;
  }

  if (unresolvedPlan && stripe.priceId) {
    payload.unresolvedStripePriceId = stripe.priceId;
  }

  return { payload, userSnapshotPayload, fieldsToWrite, unresolvedPlan };
}

export function planStripeLinkageRow(input: {
  uid: string | null;
  email: string | null;
  stripe: StripeSubscriptionSnapshot;
  existing: FirestoreSubscriptionSnapshot | null;
  confidence: string;
  conflictReasons: string[];
}): StripeLinkagePlanRow {
  const { uid, email, stripe, existing, confidence, conflictReasons } = input;

  if (confidence === 'ambiguous') {
    return {
      uid,
      email,
      stripeCustomerId: stripe.customerId,
      stripeSubscriptionId: stripe.id,
      existingFirestoreSubscription: Boolean(existing),
      proposedAction: 'ambiguous',
      conflict: false,
      conflictReasons,
      unresolvedPlan: false,
      fieldsToWrite: [],
    };
  }

  if (confidence === 'conflict' || conflictReasons.length > 0) {
    return {
      uid,
      email,
      stripeCustomerId: stripe.customerId,
      stripeSubscriptionId: stripe.id,
      existingFirestoreSubscription: Boolean(existing),
      proposedAction: 'conflict',
      conflict: true,
      conflictReasons,
      unresolvedPlan: false,
      fieldsToWrite: [],
    };
  }

  if (!uid) {
    return {
      uid: null,
      email,
      stripeCustomerId: stripe.customerId,
      stripeSubscriptionId: stripe.id,
      existingFirestoreSubscription: Boolean(existing),
      proposedAction: 'skipped',
      conflict: false,
      conflictReasons: [],
      unresolvedPlan: false,
      fieldsToWrite: [],
    };
  }

  const built = buildSubscriptionLinkagePayload({ uid, stripe, existing });
  const alreadyLinked =
    existing &&
    existing.stripeCustomerId === stripe.customerId &&
    existing.stripeSubscriptionId === stripe.id &&
    existing.status === built.payload.status &&
    (!built.payload.plan || existing.plan === built.payload.plan);

  if (alreadyLinked) {
    return {
      uid,
      email,
      stripeCustomerId: stripe.customerId,
      stripeSubscriptionId: stripe.id,
      existingFirestoreSubscription: true,
      proposedAction: 'no-op',
      conflict: false,
      conflictReasons: [],
      unresolvedPlan: built.unresolvedPlan,
      fieldsToWrite: [],
    };
  }

  const proposedAction = existing ? 'update-linkage' : 'create';

  return {
    uid,
    email,
    stripeCustomerId: stripe.customerId,
    stripeSubscriptionId: stripe.id,
    existingFirestoreSubscription: Boolean(existing),
    proposedAction,
    conflict: false,
    conflictReasons: [],
    unresolvedPlan: built.unresolvedPlan,
    fieldsToWrite: built.fieldsToWrite,
    payload: built.payload,
    userSnapshotPayload: built.userSnapshotPayload,
  };
}

export function summarizeLinkagePlans(rows: StripeLinkagePlanRow[]) {
  return {
    matched: rows.filter((r) => r.uid && r.proposedAction !== 'skipped').length,
    unmatched: rows.filter((r) => r.proposedAction === 'skipped').length,
    ambiguous: rows.filter((r) => r.proposedAction === 'ambiguous').length,
    conflicts: rows.filter((r) => r.proposedAction === 'conflict').length,
    noOp: rows.filter((r) => r.proposedAction === 'no-op').length,
    create: rows.filter((r) => r.proposedAction === 'create').length,
    updateLinkage: rows.filter((r) => r.proposedAction === 'update-linkage').length,
    skipped: rows.filter((r) => r.proposedAction === 'skipped').length,
    unresolvedPlan: rows.filter((r) => r.unresolvedPlan).length,
  };
}

export function formatLinkagePlanTable(rows: StripeLinkagePlanRow[]): string {
  const header =
    '| UID | Email | Stripe Customer | Subscription | Existing FS? | Proposed Write | Conflict? |';
  const sep = '|---|---|---|---|---|---|---|';
  const lines = rows.map((row) => {
    const conflict = row.conflict || row.proposedAction === 'conflict' ? 'yes' : 'no';
    return `| ${row.uid ?? '(none)'} | ${row.email ?? ''} | ${row.stripeCustomerId} | ${row.stripeSubscriptionId} | ${row.existingFirestoreSubscription ? 'yes' : 'no'} | ${row.proposedAction} | ${conflict} |`;
  });
  return [header, sep, ...lines].join('\n');
}

export function formatDiscoveryTable(
  rows: Array<{
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    email: string | null;
    metadataUid: string | null;
    authUserMatch: string | null;
    confidence: string;
    action: string;
  }>,
): string {
  const header =
    '| Stripe Customer | Stripe Subscription | Email | Firebase UID metadata | Auth user match | Confidence | Action |';
  const sep = '|---|---|---|---|---|---|---|';
  const lines = rows.map(
    (row) =>
      `| ${row.stripeCustomerId} | ${row.stripeSubscriptionId ?? ''} | ${row.email ?? ''} | ${row.metadataUid ?? ''} | ${row.authUserMatch ?? ''} | ${row.confidence} | ${row.action} |`,
  );
  return [header, sep, ...lines].join('\n');
}
