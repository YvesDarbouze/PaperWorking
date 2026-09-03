import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { findProfileUserByUid } from './profile-user-access.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore user.settings sections for Nest non-profile settings routes. */
export function createFirestoreUserSettingsRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  async function resolveUserRef(uid: string) {
    const db = await requireFirestore(firestoreFactory);
    const found = await findProfileUserByUid(db, uid);
    if (!found) return null;
    return db.collection(FIRESTORE_COLLECTIONS.users).doc(found.documentId);
  }

  return {
    async getSettingsSection(uid: string, section: string) {
      const ref = await resolveUserRef(uid);
      if (!ref) return null;
      const snap = await ref.get();
      const data = documentData(snap);
      if (!data) return null;
      const settings =
        data.settings && typeof data.settings === 'object'
          ? (data.settings as Record<string, unknown>)
          : {};
      return {
        userId: foundUserId(data, snap.id),
        settings,
        sectionValue: settings[section] ?? {},
      };
    },

    async updateSettingsSection(
      uid: string,
      section: string,
      sectionPatch: Record<string, unknown>,
    ) {
      const ref = await resolveUserRef(uid);
      if (!ref) return null;
      const snap = await ref.get();
      const data = documentData(snap);
      if (!data) return null;
      const existing =
        data.settings && typeof data.settings === 'object'
          ? { ...(data.settings as Record<string, unknown>) }
          : {};
      existing[section] = {
        ...((existing[section] as object) || {}),
        ...sectionPatch,
      };
      await ref.set(
        {
          settings: existing,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return {
        userId: foundUserId(data, snap.id),
        settings: existing[section],
      };
    },

    async deleteSettingsSection(uid: string, section: string) {
      const ref = await resolveUserRef(uid);
      if (!ref) return null;
      const snap = await ref.get();
      const data = documentData(snap);
      if (!data) return null;
      const existing =
        data.settings && typeof data.settings === 'object'
          ? { ...(data.settings as Record<string, unknown>) }
          : {};
      delete existing[section];
      await ref.set(
        {
          settings: existing,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { userId: foundUserId(data, snap.id), deleted: true };
    },
  };
}

function foundUserId(data: Record<string, unknown>, documentId: string): string {
  return typeof data.uid === 'string' ? data.uid : documentId;
}

export type FirestoreUserSettingsRepository = ReturnType<
  typeof createFirestoreUserSettingsRepository
>;
