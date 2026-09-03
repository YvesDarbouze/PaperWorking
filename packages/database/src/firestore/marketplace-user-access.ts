import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS } from './admin.js';
import {
  marketplaceUserFromFirestore,
  type MarketplaceUserFields,
} from './converters/marketplace-user.converter.js';
import { documentData } from './repositories/firestore-access.js';

/** Resolve a marketplace user row by Firebase uid, doc id, or legacyFirebaseUid. */
export async function findMarketplaceUserByUid(
  db: Firestore,
  uid: string,
): Promise<MarketplaceUserFields | null> {
  const col = db.collection(FIRESTORE_COLLECTIONS.users);

  const direct = await col.doc(uid).get();
  const directData = documentData(direct);
  if (directData) {
    return marketplaceUserFromFirestore(direct.id, directData);
  }

  for (const field of ['legacyFirebaseUid', 'uid'] as const) {
    const snap = await col.where(field, '==', uid).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) continue;
    const data = documentData(doc);
    if (data) return marketplaceUserFromFirestore(doc.id, data);
  }

  return null;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesInvestorSearch(row: MarketplaceUserFields, q?: string): boolean {
  if (!q) return true;
  const needle = normalizeSearch(q);
  const haystacks = [row.name, row.displayName, row.companyName]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(normalizeSearch);
  return haystacks.some((value) => value.includes(needle));
}

export function sortByUpdatedAtDesc<T extends { updatedAt?: Date }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
  );
}

export function sortByCreatedAtDesc<T extends { createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function sortByCreatedAtAsc<T extends { createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
