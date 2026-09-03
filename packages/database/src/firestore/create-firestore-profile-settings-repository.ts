import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { profileUserFromFirestore } from './converters/profile-user.converter.js';
import { findProfileUserByUid } from './profile-user-access.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

type ProfileUpdateData = Partial<{
  name: string | null;
  displayName: string | null;
  phone: string | null;
  timezone: string | null;
  companyName: string | null;
  avatarUrl: string | null;
}>;

/** Firestore ProfileSettingsRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreProfileSettingsRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async findByAuthUid(uid: string) {
      const db = await requireFirestore(firestoreFactory);
      const found = await findProfileUserByUid(db, uid);
      return found?.row ?? null;
    },

    async updateProfileFields(id: string, data: ProfileUpdateData) {
      const db = await requireFirestore(firestoreFactory);
      const found = await findProfileUserByUid(db, id);
      if (!found) {
        throw new Error('User not found');
      }

      const ref = db.collection(FIRESTORE_COLLECTIONS.users).doc(found.documentId);
      const payload: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (data.name !== undefined) payload.name = data.name;
      if (data.displayName !== undefined) payload.displayName = data.displayName;
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.timezone !== undefined) payload.timezone = data.timezone;
      if (data.companyName !== undefined) payload.companyName = data.companyName;
      if (data.avatarUrl !== undefined) {
        payload.avatarUrl = data.avatarUrl;
        payload.photoURL = data.avatarUrl;
      }

      await ref.set(payload, { merge: true });
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('User not found after update');
      return profileUserFromFirestore(snap.id, stored);
    },
  };
}

export type FirestoreProfileSettingsRepository = ReturnType<
  typeof createFirestoreProfileSettingsRepository
>;
