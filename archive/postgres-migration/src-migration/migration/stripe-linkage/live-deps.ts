import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from '../../firestore/admin.js';
import { subscriptionFromFirestore } from '../../firestore/converters/subscription.converter.js';
import { documentData } from '../../firestore/repositories/firestore-access.js';
import { optionalString } from '../../firestore/converters/timestamp.js';
import { listLiveStripeBillingObjects } from './stripe-read.js';
import type { StripeLinkageDeps } from './run-stripe-linkage.js';
import type {
  AuthUserIndexEntry,
  FirestoreSubscriptionSnapshot,
  FirestoreUserBillingSnapshot,
  StripeSubscriptionSnapshot,
} from './types.js';

export async function createLiveStripeLinkageDeps(): Promise<StripeLinkageDeps> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for Stripe linkage audit.');
  }

  const db = await getFirestoreAdmin();
  if (!db) {
    throw new Error('Firestore Admin is not configured (missing Firebase credentials).');
  }

  const { getAuth } = await import('firebase-admin/auth');
  const { getApps } = await import('firebase-admin/app');
  const auth = getAuth(getApps()[0]);

  let cachedStripe:
    | { customers: Array<{ id: string; email: string | null }>; subscriptions: StripeSubscriptionSnapshot[] }
    | null = null;

  async function loadStripe() {
    if (!cachedStripe) {
      const live = await listLiveStripeBillingObjects(secretKey);
      cachedStripe = {
        customers: live.customers.map((c) => ({ id: c.id, email: c.email })),
        subscriptions: live.subscriptions,
      };
    }
    return cachedStripe;
  }

  return {
    async listAuthUsers(): Promise<AuthUserIndexEntry[]> {
      const users: AuthUserIndexEntry[] = [];
      let pageToken: string | undefined;
      do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) {
          users.push({ uid: user.uid, email: user.email ?? null });
        }
        pageToken = page.pageToken;
      } while (pageToken);
      return users;
    },

    async listStripeSubscriptions(): Promise<StripeSubscriptionSnapshot[]> {
      return (await loadStripe()).subscriptions;
    },

    async listStripeCustomers() {
      return (await loadStripe()).customers;
    },

    async getFirestoreSubscription(uid: string): Promise<FirestoreSubscriptionSnapshot | null> {
      const subSnap = await db.collection(FIRESTORE_COLLECTIONS.subscriptions).doc(uid).get();
      const subData = documentData(subSnap);
      if (subData) {
        const record = subscriptionFromFirestore(subSnap.id, subData);
        return {
          uid: subSnap.id,
          plan: record.plan,
          status: record.status,
          stripeCustomerId: record.stripeCustomerId,
          stripeSubscriptionId: record.stripeSubscriptionId,
          updatedAt: subData.updatedAt ?? null,
        };
      }

      const userSnap = await db.collection(FIRESTORE_COLLECTIONS.users).doc(uid).get();
      const userData = documentData(userSnap);
      if (!userData) return null;

      return {
        uid,
        plan: optionalString(userData.subscriptionPlan),
        status: optionalString(userData.subscriptionStatus),
        stripeCustomerId: optionalString(userData.stripeCustomerId),
        stripeSubscriptionId: optionalString(userData.stripeSubscriptionId),
        updatedAt: userData.updatedAt ?? null,
      };
    },

    async listFirestoreUserBilling(): Promise<FirestoreUserBillingSnapshot[]> {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.users).get();
      return snap.docs.map((doc) => {
        const data = documentData(doc) ?? {};
        return {
          uid: doc.id,
          email: optionalString(data.email),
          stripeCustomerId: optionalString(data.stripeCustomerId),
          stripeSubscriptionId: optionalString(data.stripeSubscriptionId),
          subscriptionPlan: optionalString(data.subscriptionPlan),
          subscriptionStatus: optionalString(data.subscriptionStatus),
        };
      });
    },

    async writeSubscriptionLinkage(uid, subscriptionPayload, userSnapshotPayload) {
      const subRef = db.collection(FIRESTORE_COLLECTIONS.subscriptions).doc(uid);
      const beforeSub = documentData(await subRef.get());
      const beforeUser = documentData(
        await db.collection(FIRESTORE_COLLECTIONS.users).doc(uid).get(),
      );

      const subWrite: Record<string, unknown> = {
        ...subscriptionPayload,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!beforeSub?.createdAt && !subscriptionPayload.createdAt) {
        subWrite.createdAt = FieldValue.serverTimestamp();
      }

      await subRef.set(subWrite, { merge: true });

      const userWrite: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      for (const [key, value] of Object.entries(userSnapshotPayload)) {
        if (key === 'updatedAt') continue;
        userWrite[key] = value;
      }
      await db.collection(FIRESTORE_COLLECTIONS.users).doc(uid).set(userWrite, { merge: true });

      console.log(
        JSON.stringify({
          linkageWrite: {
            uid,
            beforeSub: beforeSub
              ? {
                  stripeCustomerId: beforeSub.stripeCustomerId,
                  stripeSubscriptionId: beforeSub.stripeSubscriptionId,
                  status: beforeSub.status ?? beforeSub.subscriptionStatus,
                }
              : null,
            afterSub: subscriptionPayload,
            beforeUserBilling: beforeUser
              ? {
                  stripeCustomerId: beforeUser.stripeCustomerId,
                  stripeSubscriptionId: beforeUser.stripeSubscriptionId,
                  subscriptionStatus: beforeUser.subscriptionStatus,
                }
              : null,
            afterUserBilling: userSnapshotPayload,
          },
        }),
      );
    },

    async countFirestoreSubscriptions() {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.subscriptions).count().get();
      return snap.data().count;
    },
  };
}
