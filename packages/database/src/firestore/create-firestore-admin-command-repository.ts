import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { optionalString, toDate } from './converters/timestamp.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

export type AdminAuditLogRecord = {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetResourceId: string | null;
  status: string;
  entryHash: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
};

/** Firestore `/auditLogs` writes for privileged Nest admin operations. */
export function createFirestoreAdminCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async writeAuditLog(data: {
      actorUid: string;
      actorEmail: string;
      actorRole: string;
      action: string;
      targetResource: string;
      targetResourceId?: string;
      status: string;
      entryHash: string;
      metadata?: Record<string, unknown>;
    }): Promise<AdminAuditLogRecord> {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload = {
        id,
        actorUid: data.actorUid,
        actorEmail: data.actorEmail,
        actorRole: data.actorRole,
        action: data.action,
        targetResource: data.targetResource,
        targetResourceId: data.targetResourceId ?? null,
        status: data.status,
        entryHash: data.entryHash,
        metadata: data.metadata ?? {},
        timestamp: now,
        createdAt: now,
      };

      const ref = db.collection(FIRESTORE_COLLECTIONS.auditLogs).doc(id);
      await ref.set(payload);
      return {
        id,
        actorUid: data.actorUid,
        actorEmail: data.actorEmail,
        actorRole: data.actorRole,
        action: data.action,
        targetResource: data.targetResource,
        targetResourceId: data.targetResourceId ?? null,
        status: data.status,
        entryHash: data.entryHash,
        metadata: data.metadata ?? {},
        timestamp: new Date(),
      };
    },

    async updateUserAccountType(input: {
      documentId: string;
      accountType: string;
      clearPlatformAdminRole: boolean;
    }): Promise<void> {
      const db = await requireFirestore(firestoreFactory);
      const ref = db.collection(FIRESTORE_COLLECTIONS.users).doc(input.documentId);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new Error('User not found');
      }

      const update: Record<string, unknown> = {
        accountType: input.accountType,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (input.clearPlatformAdminRole) {
        update.role = FieldValue.delete();
      }

      await ref.update(update);
    },

    async findSyntheticAgentById(id: string) {
      const db = await requireFirestore(firestoreFactory);
      const direct = await db.collection(FIRESTORE_COLLECTIONS.users).doc(id).get();
      let data = documentData(direct);
      if (data?.syntheticAgent === true) {
        return {
          id: direct.id,
          email: optionalString(data.email) ?? '',
          displayName: optionalString(data.displayName) ?? optionalString(data.name),
          name: optionalString(data.name),
          agentPersona: optionalString(data.agentPersona),
        };
      }

      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.users)
        .where('uid', '==', id)
        .where('syntheticAgent', '==', true)
        .limit(1)
        .get();
      const doc = snap.docs[0];
      if (!doc) return null;
      data = documentData(doc);
      if (!data || data.syntheticAgent !== true) return null;
      return {
        id: doc.id,
        email: optionalString(data.email) ?? '',
        displayName: optionalString(data.displayName) ?? optionalString(data.name),
        name: optionalString(data.name),
        agentPersona: optionalString(data.agentPersona),
      };
    },
  };
}

export type FirestoreAdminCommandRepository = ReturnType<
  typeof createFirestoreAdminCommandRepository
>;
