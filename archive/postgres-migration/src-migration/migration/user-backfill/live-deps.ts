import { getApiPrismaClient } from '../../client.js';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from '../../firestore/admin.js';
import { documentData } from '../../firestore/repositories/firestore-access.js';
import type { AuthUserSnapshot, PostgresUserSnapshot } from './types.js';
import type { UserBackfillDeps } from './run-user-backfill.js';

export async function createLiveUserBackfillDeps(): Promise<UserBackfillDeps> {
  const prisma = getApiPrismaClient();
  const db = await getFirestoreAdmin();
  if (!db) {
    throw new Error('Firestore Admin is not configured (missing Firebase credentials).');
  }

  const { getAuth } = await import('firebase-admin/auth');
  const { getApps } = await import('firebase-admin/app');
  const auth = getAuth(getApps()[0]);

  return {
    async listAuthUsers(): Promise<AuthUserSnapshot[]> {
      const users: AuthUserSnapshot[] = [];
      let pageToken: string | undefined;
      do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) {
          users.push({
            uid: user.uid,
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            photoURL: user.photoURL ?? null,
            phoneNumber: user.phoneNumber ?? null,
            createdAt: user.metadata.creationTime
              ? new Date(user.metadata.creationTime)
              : null,
            disabled: user.disabled,
          });
        }
        pageToken = page.pageToken;
      } while (pageToken);
      return users;
    },

    async listPostgresUsers(): Promise<PostgresUserSnapshot[]> {
      const rows = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          legacyFirebaseUid: true,
          name: true,
          displayName: true,
          phone: true,
          role: true,
          accountType: true,
          timezone: true,
          avatarUrl: true,
          companyName: true,
          syntheticAgent: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return rows;
    },

    async getFirestoreUser(uid: string) {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.users).doc(uid).get();
      return documentData(snap);
    },

    async writeFirestoreUser(uid, payload, mode) {
      const ref = db.collection(FIRESTORE_COLLECTIONS.users).doc(uid);
      if (mode === 'create') {
        const existing = await ref.get();
        if (existing.exists) {
          await ref.set(payload, { merge: true });
          return;
        }
        await ref.set(payload, { merge: false });
        return;
      }
      await ref.set(payload, { merge: true });
    },

    async countFirestoreUsers() {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.users).count().get();
      return snap.data().count;
    },
  };
}
