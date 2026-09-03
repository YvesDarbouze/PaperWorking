import { optionalString } from './converters/timestamp.js';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { vendorFromFirestore } from './converters/vendor.converter.js';
import { sortByUpdatedAtDesc } from './marketplace-user-access.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

const VENDOR_LIST_LIMIT = 100;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesVendorSearch(
  row: ReturnType<typeof vendorFromFirestore>,
  q?: string,
): boolean {
  if (!q) return true;
  const needle = normalizeSearch(q);
  const fields = [row.name, row.type, row.contactEmail]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(normalizeSearch);
  return fields.some((value) => value.includes(needle));
}

async function queryVendorsByOrgIds(
  db: Awaited<ReturnType<typeof requireFirestore>>,
  organizationIds: string[],
) {
  if (organizationIds.length === 0) return [];

  const seen = new Map<string, ReturnType<typeof vendorFromFirestore>>();
  const chunks: string[][] = [];
  for (let i = 0; i < organizationIds.length; i += 10) {
    chunks.push(organizationIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.vendors)
      .where('organizationId', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      const data = documentData(doc);
      if (!data) continue;
      seen.set(doc.id, vendorFromFirestore(doc.id, data));
    }
  }

  return [...seen.values()];
}

/** Firestore VendorsReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreVendorsReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listVendors(input: { organizationIds: string[]; q?: string }) {
      const db = await requireFirestore(firestoreFactory);
      const rows = await queryVendorsByOrgIds(db, input.organizationIds);
      const filtered = rows.filter((row) => matchesVendorSearch(row, input.q));
      return sortByUpdatedAtDesc(filtered).slice(0, VENDOR_LIST_LIMIT);
    },
  };
}

export type FirestoreVendorsReadRepository = ReturnType<typeof createFirestoreVendorsReadRepository>;

/** Resolve a vendor row by contact email (case-insensitive). */
export async function findVendorByContactEmail(
  db: Awaited<ReturnType<typeof requireFirestore>>,
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.vendors)
    .where('contactEmail', '==', normalized)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const data = documentData(doc);
  if (!data) return null;
  return vendorFromFirestore(doc.id, data);
}

export async function listVendorRequestsForVendor(
  db: Awaited<ReturnType<typeof requireFirestore>>,
  vendor: ReturnType<typeof vendorFromFirestore>,
) {
  const vendorUid = vendor.vendorUid;
  const snap = vendorUid
    ? await db.collectionGroup(FIRESTORE_COLLECTIONS.vendorRequests).where('vendorUid', '==', vendorUid).get()
    : await db.collectionGroup(FIRESTORE_COLLECTIONS.vendorRequests).where('vendorId', '==', vendor.id).get();

  return snap.docs.map((doc) => ({
    doc,
    path: (doc as { ref?: { path?: string } }).ref?.path ?? '',
  }));
}

export function vendorRequestCollectionPath(projectId: string): string {
  return `${FIRESTORE_COLLECTIONS.projects}/${projectId}/${FIRESTORE_COLLECTIONS.vendorRequests}`;
}

export function parseProjectIdFromRequestPath(path: string): string | null {
  const parts = path.split('/');
  const projectsIndex = parts.indexOf(FIRESTORE_COLLECTIONS.projects);
  if (projectsIndex < 0 || projectsIndex + 1 >= parts.length) return null;
  return parts[projectsIndex + 1] ?? null;
}

export async function findVendorRequestForVendor(
  db: Awaited<ReturnType<typeof requireFirestore>>,
  vendor: ReturnType<typeof vendorFromFirestore>,
  bidId: string,
) {
  const matches = await listVendorRequestsForVendor(db, vendor);
  const hit = matches.find(({ doc }) => doc.id === bidId);
  if (!hit) return null;
  const data = documentData(hit.doc);
  if (!data) return null;
  const projectId = optionalString(data.projectId) ?? parseProjectIdFromRequestPath(hit.path);
  return { doc: hit.doc, data, projectId };
}
