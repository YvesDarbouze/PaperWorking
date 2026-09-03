import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { vendorFromFirestore } from './converters/vendor.converter.js';
import {
  findVendorByContactEmail,
  findVendorRequestForVendor,
  vendorRequestCollectionPath,
} from './create-firestore-vendors-read-repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore VendorPortalCommandRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreVendorPortalCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async findVendorByContactEmail(email: string) {
      const db = await requireFirestore(firestoreFactory);
      return findVendorByContactEmail(db, email.trim().toLowerCase());
    },

    async createVendor(data: {
      organizationId: string;
      name: string;
      type: string;
      contactEmail?: string;
      contactPhone?: string;
    }) {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload = {
        id,
        organizationId: data.organizationId,
        name: data.name,
        type: data.type,
        contactEmail: data.contactEmail?.trim().toLowerCase(),
        contactPhone: data.contactPhone,
        createdAt: now,
        updatedAt: now,
      };
      const ref = db.collection(FIRESTORE_COLLECTIONS.vendors).doc(id);
      await ref.set(payload);
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create vendor');
      return vendorFromFirestore(snap.id, stored);
    },

    async updateVendor(
      id: string,
      data: {
        name?: string;
        type?: string;
        contactEmail?: string;
        contactPhone?: string;
      },
    ) {
      const db = await requireFirestore(firestoreFactory);
      const ref = db.collection(FIRESTORE_COLLECTIONS.vendors).doc(id);
      const update: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (typeof data.name === 'string') update.name = data.name;
      if (typeof data.type === 'string') update.type = data.type;
      if (typeof data.contactEmail === 'string') {
        update.contactEmail = data.contactEmail.trim().toLowerCase();
      }
      if (typeof data.contactPhone === 'string') update.contactPhone = data.contactPhone;
      await ref.set(update, { merge: true });
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Vendor not found after update');
      return vendorFromFirestore(snap.id, stored);
    },

    async findBidForVendor(vendorId: string, bidId: string) {
      const db = await requireFirestore(firestoreFactory);
      const vendorSnap = await db.collection(FIRESTORE_COLLECTIONS.vendors).doc(vendorId).get();
      const vendorData = documentData(vendorSnap);
      if (!vendorData) return null;
      const vendor = vendorFromFirestore(vendorSnap.id, vendorData);
      const hit = await findVendorRequestForVendor(db, vendor, bidId);
      if (!hit) return null;
      const quotedFee =
        typeof hit.data.quotedFee === 'number' && Number.isFinite(hit.data.quotedFee)
          ? hit.data.quotedFee
          : 0;
      return {
        id: hit.doc.id,
        vendorId,
        milestoneId: String(hit.data.projectId ?? hit.projectId ?? ''),
        bidAmount: BigInt(Math.round(quotedFee * 100)),
        status: String(hit.data.status ?? 'PENDING'),
        notes:
          typeof hit.data.notes === 'string'
            ? hit.data.notes
            : typeof hit.data.message === 'string'
              ? hit.data.message
              : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    async updateBid(
      id: string,
      data: {
        status?: string;
        notes?: string;
        bidAmount?: bigint;
      },
    ) {
      const db = await requireFirestore(firestoreFactory);
      const vendorMatches = await db.collectionGroup(FIRESTORE_COLLECTIONS.vendorRequests).get();
      const hit = vendorMatches.docs.find((doc) => doc.id === id);
      if (!hit) throw new Error('Vendor request not found');

      const existing = documentData(hit);
      if (!existing) throw new Error('Vendor request not found');

      const projectId = String(existing.projectId ?? parseProjectIdFromPath(hit.ref.path) ?? '');
      const update: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (typeof data.status === 'string') update.status = data.status;
      if (typeof data.notes === 'string') {
        update.notes = data.notes;
        update.responseMessage = data.notes;
      }
      if (data.bidAmount != null) {
        update.quotedFee = Number(data.bidAmount) / 100;
      }

      const ref = projectId
        ? db.doc(`${vendorRequestCollectionPath(projectId)}/${id}`)
        : hit.ref;
      await ref.set(update, { merge: true });

      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Vendor request not found after update');
      const quotedFee =
        typeof stored.quotedFee === 'number' && Number.isFinite(stored.quotedFee)
          ? stored.quotedFee
          : 0;

      return {
        id,
        vendorId: String(stored.vendorId ?? existing.vendorId ?? ''),
        milestoneId: String(stored.projectId ?? projectId),
        bidAmount: BigInt(Math.round(quotedFee * 100)),
        status: String(stored.status ?? 'PENDING'),
        notes:
          typeof stored.notes === 'string'
            ? stored.notes
            : typeof stored.message === 'string'
              ? stored.message
              : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  };
}

function parseProjectIdFromPath(path: string): string | null {
  const parts = path.split('/');
  const projectsIndex = parts.indexOf(FIRESTORE_COLLECTIONS.projects);
  if (projectsIndex < 0 || projectsIndex + 1 >= parts.length) return null;
  return parts[projectsIndex + 1] ?? null;
}

export type FirestoreVendorPortalCommandRepository = ReturnType<
  typeof createFirestoreVendorPortalCommandRepository
>;
