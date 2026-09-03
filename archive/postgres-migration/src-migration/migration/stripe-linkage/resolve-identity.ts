const UID_METADATA_KEYS = ['userId', 'uid', 'firebaseUid', 'firebase_uid'] as const;

const INVALID_METADATA_UIDS = new Set([
  '',
  'guest',
  'anonymous',
  'unknown',
  'null',
  'undefined',
  'none',
]);

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function extractUidFromMetadata(
  metadata: Record<string, string> | null | undefined,
): string | null {
  if (!metadata) return null;
  for (const key of UID_METADATA_KEYS) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      if (INVALID_METADATA_UIDS.has(trimmed.toLowerCase())) {
        continue;
      }
      return trimmed;
    }
  }
  return null;
}

export function buildEmailIndex(
  authUsers: Array<{ uid: string; email: string | null }>,
): {
  uniqueByEmail: Map<string, string>;
  ambiguousEmails: Set<string>;
} {
  const counts = new Map<string, string[]>();
  for (const user of authUsers) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    const list = counts.get(email) ?? [];
    list.push(user.uid);
    counts.set(email, list);
  }

  const uniqueByEmail = new Map<string, string>();
  const ambiguousEmails = new Set<string>();
  for (const [email, uids] of counts) {
    if (uids.length === 1) {
      uniqueByEmail.set(email, uids[0]!);
    } else {
      ambiguousEmails.add(email);
    }
  }
  return { uniqueByEmail, ambiguousEmails };
}

export type IdentityResolution = {
  uid: string | null;
  confidence: 'verified_metadata' | 'existing_linkage' | 'unique_email' | 'unmatched' | 'ambiguous' | 'conflict';
  conflictReasons: string[];
  matchSources: string[];
};

export function resolveStripeIdentity(input: {
  subscriptionMetadata: Record<string, string>;
  customerMetadata: Record<string, string>;
  customerEmail: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  firestoreUsersByStripeCustomer: Map<string, string>;
  firestoreUsersByStripeSubscription: Map<string, string>;
  firestoreSubscriptionsByStripeSubscription: Map<string, string>;
  uniqueEmailToUid: Map<string, string>;
  ambiguousEmails: Set<string>;
  authUids: Set<string>;
}): IdentityResolution {
  const candidates = new Map<string, string[]>();

  function addCandidate(uid: string, source: string): void {
    if (!uid.trim()) return;
    const list = candidates.get(uid) ?? [];
    list.push(source);
    candidates.set(uid, list);
  }

  const subUid = extractUidFromMetadata(input.subscriptionMetadata);
  const custUid = extractUidFromMetadata(input.customerMetadata);
  if (subUid) addCandidate(subUid, 'subscription.metadata');
  if (custUid) addCandidate(custUid, 'customer.metadata');

  const fsByCustomer = input.firestoreUsersByStripeCustomer.get(input.stripeCustomerId);
  if (fsByCustomer) addCandidate(fsByCustomer, 'firestore.stripeCustomerId');

  const fsBySubUser = input.firestoreUsersByStripeSubscription.get(input.stripeSubscriptionId);
  if (fsBySubUser) addCandidate(fsBySubUser, 'firestore.stripeSubscriptionId');

  const fsSubDocUid = input.firestoreSubscriptionsByStripeSubscription.get(
    input.stripeSubscriptionId,
  );
  if (fsSubDocUid) addCandidate(fsSubDocUid, 'firestore.subscriptionDoc');

  const email = normalizeEmail(input.customerEmail);
  if (email) {
    if (input.ambiguousEmails.has(email)) {
      return {
        uid: null,
        confidence: 'ambiguous',
        conflictReasons: [`ambiguous_email:${email}`],
        matchSources: [],
      };
    }
    const emailUid = input.uniqueEmailToUid.get(email);
    if (emailUid) addCandidate(emailUid, 'unique_email');
  }

  const uids = [...candidates.keys()];
  const conflictReasons: string[] = [];

  if (subUid && custUid && subUid !== custUid) {
    conflictReasons.push(`metadata_conflict:subscription=${subUid},customer=${custUid}`);
  }

  if (uids.length === 0) {
    return {
      uid: null,
      confidence: 'unmatched',
      conflictReasons: [],
      matchSources: [],
    };
  }

  if (uids.length > 1) {
    return {
      uid: null,
      confidence: 'conflict',
      conflictReasons: [
        ...conflictReasons,
        `multiple_uids:${uids.map((uid) => `${uid}[${(candidates.get(uid) ?? []).join('+')}]`).join(';')}`,
      ],
      matchSources: uids.flatMap((uid) => candidates.get(uid) ?? []),
    };
  }

  const uid = uids[0]!;
  if (!input.authUids.has(uid)) {
    return {
      uid: null,
      confidence: 'conflict',
      conflictReasons: [
        ...conflictReasons,
        `metadata_uid_not_in_auth:${uid}`,
      ],
      matchSources: candidates.get(uid) ?? [],
    };
  }

  if (conflictReasons.length > 0) {
    return {
      uid: null,
      confidence: 'conflict',
      conflictReasons,
      matchSources: candidates.get(uid) ?? [],
    };
  }

  const sources = candidates.get(uid) ?? [];
  let confidence: IdentityResolution['confidence'] = 'unmatched';
  if (sources.some((s) => s.includes('metadata'))) {
    confidence = 'verified_metadata';
  } else if (sources.some((s) => s.startsWith('firestore.'))) {
    confidence = 'existing_linkage';
  } else if (sources.includes('unique_email')) {
    confidence = 'unique_email';
  }

  return { uid, confidence, conflictReasons: [], matchSources: sources };
}
