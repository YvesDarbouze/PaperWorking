import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { organizationMemberFromFirestore } from './converters/organization-member.converter.js';
import { organizationMemberToRecord } from './converters/organization-member-record.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

function sortByCreatedAtAsc<T extends { createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Firestore TeamMembersReadRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreTeamMembersReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listByOrganizationId(organizationId: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.organizationMembers)
        .where('organizationId', '==', organizationId)
        .get();

      const members = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        try {
          return [organizationMemberToRecord(organizationMemberFromFirestore(doc.id, data))];
        } catch {
          return [];
        }
      });

      return sortByCreatedAtAsc(members);
    },
  };
}

export type FirestoreTeamMembersReadRepository = ReturnType<
  typeof createFirestoreTeamMembersReadRepository
>;
