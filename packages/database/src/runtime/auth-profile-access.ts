import { userFromFirestore } from '../firestore/converters/user.converter.js';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from '../firestore/admin.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from '../firestore/repositories/firestore-access.js';

export type AuthProfileUserRow = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
  legacyFirebaseUid?: string | null;
};

export type AuthProfileSubscriptionRow = {
  plan?: string | null;
  status?: string | null;
  stripeSubscriptionId?: string | null;
};

export type AuthProfileAccess = {
  findUser: (uid: string) => Promise<AuthProfileUserRow | null>;
  findSubscription: (userId: string) => Promise<AuthProfileSubscriptionRow | null>;
  findSubscriptionForUid: (uid: string) => Promise<{ plan: string; status: string } | null>;
};

export function createFirestoreAuthProfileAccess(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
): AuthProfileAccess {
  async function loadUserDoc(uid: string) {
    const db = await requireFirestore(firestoreFactory);
    const col = db.collection(FIRESTORE_COLLECTIONS.users);

    const byId = await col.doc(uid).get();
    const byIdData = documentData(byId);
    if (byIdData) {
      return userFromFirestore(byId.id, byIdData);
    }

    const legacy = await col.where('legacyFirebaseUid', '==', uid).limit(1).get();
    const legacyDoc = legacy.docs[0];
    if (!legacyDoc) return null;
    const legacyData = documentData(legacyDoc);
    if (!legacyData) return null;
    return userFromFirestore(legacyDoc.id, legacyData);
  }

  return {
    async findUser(uid) {
      const model = await loadUserDoc(uid);
      if (!model) return null;
      return {
        id: model.id,
        email: model.email,
        displayName: model.displayName,
        name: model.name,
        legacyFirebaseUid: model.legacyFirebaseUid,
      };
    },
    async findSubscription(userId) {
      const model = await loadUserDoc(userId);
      if (!model) return null;
      return {
        plan: model.subscriptionPlan,
        status: model.subscriptionStatus,
        stripeSubscriptionId: model.stripeSubscriptionId,
      };
    },
    async findSubscriptionForUid(uid) {
      const model = await loadUserDoc(uid);
      if (!model?.subscriptionPlan && !model?.subscriptionStatus) return null;
      return {
        plan: model.subscriptionPlan ?? 'Individual',
        status: model.subscriptionStatus ?? 'inactive',
      };
    },
  };
}

export function createAuthProfileAccess(): AuthProfileAccess {
  return createFirestoreAuthProfileAccess();
}
