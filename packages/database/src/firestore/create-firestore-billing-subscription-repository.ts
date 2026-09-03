import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import {
  subscriptionFromFirestore,
  subscriptionFromUserSnapshot,
  type SubscriptionRecord,
} from './converters/subscription.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import { optionalString } from './converters/timestamp.js';

type BillingUpdateData = Partial<
  Pick<SubscriptionRecord, 'plan' | 'status' | 'stripeCustomerId' | 'stripeSubscriptionId'>
>;

/** Denormalized entitlement snapshot on /users/{uid} — gate cache only. */
async function syncUserBillingSnapshot(
  db: Firestore,
  userId: string,
  fields: BillingUpdateData,
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (fields.plan !== undefined) payload.subscriptionPlan = fields.plan;
  if (fields.status !== undefined) payload.subscriptionStatus = fields.status;
  if (fields.stripeCustomerId !== undefined) payload.stripeCustomerId = fields.stripeCustomerId;
  if (fields.stripeSubscriptionId !== undefined) {
    payload.stripeSubscriptionId = fields.stripeSubscriptionId;
  }

  await db.collection(FIRESTORE_COLLECTIONS.users).doc(userId).set(payload, { merge: true });
}

async function readSubscriptionDoc(
  db: Firestore,
  userId: string,
): Promise<SubscriptionRecord | null> {
  const subSnap = await db.collection(FIRESTORE_COLLECTIONS.subscriptions).doc(userId).get();
  const subData = documentData(subSnap);
  if (subData) {
    return subscriptionFromFirestore(subSnap.id, subData);
  }

  const userSnap = await db.collection(FIRESTORE_COLLECTIONS.users).doc(userId).get();
  const userData = documentData(userSnap);
  if (!userData) return null;
  return subscriptionFromUserSnapshot(userId, userData);
}

async function findByStripeSubscriptionIdInternal(
  db: Firestore,
  stripeSubscriptionId: string,
): Promise<SubscriptionRecord | null> {
  const direct = await db
    .collection(FIRESTORE_COLLECTIONS.subscriptions)
    .doc(stripeSubscriptionId)
    .get();
  const directData = documentData(direct);
  if (directData) {
    return subscriptionFromFirestore(direct.id, directData);
  }

  const snap = await db
    .collection(FIRESTORE_COLLECTIONS.subscriptions)
    .where('stripeSubscriptionId', '==', stripeSubscriptionId)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const data = documentData(doc);
  return data ? subscriptionFromFirestore(doc.id, data) : null;
}

/**
 * Firestore BillingSubscriptionRepository.
 * Authoritative: /subscriptions/{userUid}
 * Denormalized snapshot: /users/{uid}.subscriptionPlan|subscriptionStatus|stripe*
 */
export function createFirestoreBillingSubscriptionRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async findByUserId(userId: string) {
      const db = await requireFirestore(firestoreFactory);
      return readSubscriptionDoc(db, userId);
    },

    async getOrCreateForUser(userId: string, defaultPlan = 'Individual') {
      const db = await requireFirestore(firestoreFactory);
      const existing = await readSubscriptionDoc(db, userId);
      if (existing) return existing;

      const now = FieldValue.serverTimestamp();
      const row: SubscriptionRecord = {
        id: userId,
        userId,
        plan: defaultPlan,
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };

      await db
        .collection(FIRESTORE_COLLECTIONS.subscriptions)
        .doc(userId)
        .set({
          id: userId,
          userId,
          plan: defaultPlan,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

      await syncUserBillingSnapshot(db, userId, {
        plan: defaultPlan,
        status: 'active',
      });

      return row;
    },

    async updateById(id: string, data: BillingUpdateData) {
      const db = await requireFirestore(firestoreFactory);
      const ref = db.collection(FIRESTORE_COLLECTIONS.subscriptions).doc(id);
      const snap = await ref.get();
      const existing = documentData(snap);

      const userId =
        optionalString(existing?.userId) ??
        id;

      const payload: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (data.plan !== undefined) payload.plan = data.plan;
      if (data.status !== undefined) payload.status = data.status;
      if (data.stripeCustomerId !== undefined) payload.stripeCustomerId = data.stripeCustomerId;
      if (data.stripeSubscriptionId !== undefined) {
        payload.stripeSubscriptionId = data.stripeSubscriptionId;
      }

      if (existing) {
        await ref.set(payload, { merge: true });
      } else {
        await ref.set(
          {
            id,
            userId,
            plan: data.plan ?? 'Individual',
            status: data.status ?? 'active',
            stripeCustomerId: data.stripeCustomerId ?? null,
            stripeSubscriptionId: data.stripeSubscriptionId ?? null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      await syncUserBillingSnapshot(db, userId, data);

      const updated = await ref.get();
      const stored = documentData(updated);
      if (!stored) {
        throw new Error('Subscription not found after update');
      }
      return subscriptionFromFirestore(updated.id, stored);
    },

    async findByStripeSubscriptionId(stripeSubscriptionId: string) {
      const db = await requireFirestore(firestoreFactory);
      return findByStripeSubscriptionIdInternal(db, stripeSubscriptionId);
    },

    async findWebhookEventById(eventId: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.stripeEvents).doc(eventId).get();
      const data = documentData(snap);
      if (!data) return null;
      return { eventId: optionalString(data.eventId) ?? eventId };
    },

    async createWebhookEvent(input: {
      eventId: string;
      eventType: string;
      status: string;
      metadata: unknown;
    }) {
      const db = await requireFirestore(firestoreFactory);
      await db
        .collection(FIRESTORE_COLLECTIONS.stripeEvents)
        .doc(input.eventId)
        .set(
          {
            eventId: input.eventId,
            type: input.eventType,
            eventType: input.eventType,
            processingStatus: input.status,
            status: input.status,
            metadata: input.metadata ?? null,
            processedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    },
  };
}

export type FirestoreBillingSubscriptionRepository = ReturnType<
  typeof createFirestoreBillingSubscriptionRepository
>;
