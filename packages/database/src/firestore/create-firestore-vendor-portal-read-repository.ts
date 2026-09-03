import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { vendorBidFromRequest, vendorFromFirestore } from './converters/vendor.converter.js';
import {
  findVendorByContactEmail,
  listVendorRequestsForVendor,
} from './create-firestore-vendors-read-repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import { sortByUpdatedAtDesc } from './marketplace-user-access.js';

/** Firestore VendorPortalReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreVendorPortalReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async findVendorByContactEmail(email: string) {
      const db = await requireFirestore(firestoreFactory);
      return findVendorByContactEmail(db, email.trim().toLowerCase());
    },

    async listVendorBids(vendorId: string) {
      const db = await requireFirestore(firestoreFactory);
      const vendorSnap = await db.collection(FIRESTORE_COLLECTIONS.vendors).doc(vendorId).get();
      const vendorData = documentData(vendorSnap);
      if (!vendorData) return [];
      const vendor = vendorFromFirestore(vendorSnap.id, vendorData);

      const matches = await listVendorRequestsForVendor(db, vendor);
      const rows = matches.flatMap(({ doc }) => {
        const data = documentData(doc);
        if (!data) return [];
        const row = vendorBidFromRequest(doc.id, data, vendorId);
        return [
          {
            id: row.id,
            vendorId: row.vendorId,
            milestoneId: row.milestoneId,
            bidAmount: row.bidAmount,
            status: row.status,
            notes: row.notes,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        ];
      });

      return sortByUpdatedAtDesc(rows);
    },
  };
}

export type FirestoreVendorPortalReadRepository = ReturnType<
  typeof createFirestoreVendorPortalReadRepository
>;
