import type { Firestore } from 'firebase-admin/firestore';
import { optionalDate, optionalString } from './converters/timestamp.js';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

type DocRow = { id: string; data: Record<string, unknown> };

function compareDesc(a: Date | null, b: Date | null): number {
  const av = a?.getTime() ?? 0;
  const bv = b?.getTime() ?? 0;
  return bv - av;
}

async function listCollectionRows(
  db: Firestore,
  collection: string,
): Promise<DocRow[]> {
  const snap = await db.collection(collection).get();
  return snap.docs.flatMap((doc) => {
    const data = documentData(doc);
    return data ? [{ id: doc.id, data }] : [];
  });
}

function sortRowsByFieldDesc(rows: DocRow[], field: string): DocRow[] {
  return [...rows].sort((a, b) => {
    const ad = optionalDate(a.data[field]);
    const bd = optionalDate(b.data[field]);
    return compareDesc(ad, bd);
  });
}

async function countCollection(db: Firestore, collection: string): Promise<number> {
  const snap = await db.collection(collection).get();
  return snap.size;
}

function userListRow(row: DocRow) {
  const uid = optionalString(row.data.uid) ?? optionalString(row.data.id) ?? row.id;
  const createdAt = optionalDate(row.data.createdAt) ?? new Date(0);
  return {
    id: uid,
    email: optionalString(row.data.email) ?? '',
    name: optionalString(row.data.name),
    displayName: optionalString(row.data.displayName),
    accountType: optionalString(row.data.accountType),
    createdAt,
  };
}

function auditRow(row: DocRow) {
  return {
    id: row.id,
    timestamp: optionalDate(row.data.timestamp) ?? optionalDate(row.data.createdAt) ?? new Date(0),
    actorEmail: optionalString(row.data.actorEmail) ?? '',
    action: optionalString(row.data.action) ?? '',
    targetResource: optionalString(row.data.targetResource) ?? '',
    targetResourceId: optionalString(row.data.targetResourceId),
    status: optionalString(row.data.status) ?? 'unknown',
  };
}

async function countAgentProjects(db: Firestore, agentId: string): Promise<number> {
  const rows = await listCollectionRows(db, FIRESTORE_COLLECTIONS.projects);
  return rows.filter((row) => {
    const userId = optionalString(row.data.userId) ?? optionalString(row.data.ownerId);
    return userId === agentId;
  }).length;
}

async function countAgentListings(db: Firestore, agentId: string): Promise<number> {
  const rows = await listCollectionRows(db, FIRESTORE_COLLECTIONS.dealListings);
  return rows.filter((row) => {
    const userId = optionalString(row.data.userId) ?? optionalString(row.data.ownerId);
    return userId === agentId;
  }).length;
}

async function countAgentMessages(db: Firestore, agentId: string): Promise<number> {
  const rows = await listCollectionRows(db, FIRESTORE_COLLECTIONS.messages);
  return rows.filter((row) => {
    const sender =
      optionalString(row.data.senderId) ??
      optionalString(row.data.userId) ??
      optionalString(row.data.fromUid);
    return sender === agentId;
  }).length;
}

async function mapSyntheticAgent(db: Firestore, row: DocRow) {
  const uid = optionalString(row.data.uid) ?? optionalString(row.data.id) ?? row.id;
  const [projectsCount, listingsCount, messagesCount] = await Promise.all([
    countAgentProjects(db, uid),
    countAgentListings(db, uid),
    countAgentMessages(db, uid),
  ]);
  return {
    id: uid,
    email: optionalString(row.data.email) ?? '',
    name: optionalString(row.data.name),
    displayName: optionalString(row.data.displayName),
    agentPersona: optionalString(row.data.agentPersona),
    projectsCount,
    listingsCount,
    messagesCount,
  };
}

/** Firestore AdminReadRepository — aggregates canonical collections; no duplicated admin stats. */
export function createFirestoreAdminReadRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async countUsers() {
      const db = await requireFirestore(firestoreFactory);
      return countCollection(db, FIRESTORE_COLLECTIONS.users);
    },

    async countSubscriptions() {
      const db = await requireFirestore(firestoreFactory);
      return countCollection(db, FIRESTORE_COLLECTIONS.subscriptions);
    },

    async countProjects() {
      const db = await requireFirestore(firestoreFactory);
      return countCollection(db, FIRESTORE_COLLECTIONS.projects);
    },

    async countListings() {
      const db = await requireFirestore(firestoreFactory);
      return countCollection(db, FIRESTORE_COLLECTIONS.dealListings);
    },

    async listRecentUsers(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const rows = sortRowsByFieldDesc(
        await listCollectionRows(db, FIRESTORE_COLLECTIONS.users),
        'createdAt',
      );
      return rows.slice(0, limit).map(userListRow);
    },

    async listRecentAuditEvents(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const rows = sortRowsByFieldDesc(
        await listCollectionRows(db, FIRESTORE_COLLECTIONS.auditLogs),
        'timestamp',
      );
      return rows.slice(0, limit).map(auditRow);
    },

    async listRecentSubscriptions(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const rows = sortRowsByFieldDesc(
        await listCollectionRows(db, FIRESTORE_COLLECTIONS.subscriptions),
        'updatedAt',
      );
      return rows.slice(0, limit).map((row) => ({
        id: optionalString(row.data.id) ?? row.id,
        status: optionalString(row.data.status),
        plan: optionalString(row.data.plan),
        userId: optionalString(row.data.userId),
        updatedAt: optionalDate(row.data.updatedAt) ?? new Date(0),
      }));
    },

    async listRecentListings(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const rows = sortRowsByFieldDesc(
        await listCollectionRows(db, FIRESTORE_COLLECTIONS.dealListings),
        'updatedAt',
      );
      return rows.slice(0, limit).map((row) => ({
        id: optionalString(row.data.id) ?? row.id,
        title: optionalString(row.data.title) ?? optionalString(row.data.name),
        userId: optionalString(row.data.userId) ?? optionalString(row.data.ownerId),
        updatedAt: optionalDate(row.data.updatedAt) ?? new Date(0),
      }));
    },

    async getAppConfigValue(key: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.systemConfig).doc(key).get();
      const data = documentData(snap);
      if (!data) return null;

      const nested = data.value;
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return nested as Record<string, unknown>;
      }

      return data as Record<string, unknown>;
    },

    async countRentcastCalls(_year: number, _month: number) {
      void _year;
      void _month;
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.systemConfig).doc('rentcast.usage').get();
      const data = documentData(snap);
      const value =
        data?.value && typeof data.value === 'object' && !Array.isArray(data.value)
          ? (data.value as Record<string, unknown>)
          : data;

      if (!value || typeof value !== 'object') return 0;

      const requestsMonth = Number(value.requestsMonth);
      if (Number.isFinite(requestsMonth)) return requestsMonth;
      const count = Number(value.count);
      if (Number.isFinite(count)) return count;
      return 0;
    },

    async listSyntheticAgents() {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.users)
        .where('syntheticAgent', '==', true)
        .get();

      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        return data ? [{ id: doc.id, data }] : [];
      });

      const sorted = sortRowsByFieldDesc(rows, 'updatedAt');
      return Promise.all(sorted.map((row) => mapSyntheticAgent(db, row)));
    },

    async getSyntheticAgentById(id: string) {
      const db = await requireFirestore(firestoreFactory);
      const direct = await db.collection(FIRESTORE_COLLECTIONS.users).doc(id).get();
      let data = documentData(direct);
      let docId = direct.id;

      if (!data || data.syntheticAgent !== true) {
        const snap = await db
          .collection(FIRESTORE_COLLECTIONS.users)
          .where('uid', '==', id)
          .where('syntheticAgent', '==', true)
          .limit(1)
          .get();
        const doc = snap.docs[0];
        if (!doc) return null;
        const found = documentData(doc);
        if (!found) return null;
        data = found;
        docId = doc.id;
      }

      if (!data || data.syntheticAgent !== true) return null;
      return mapSyntheticAgent(db, { id: docId, data });
    },

    async deleteSyntheticAgent(id: string) {
      const db = await requireFirestore(firestoreFactory);
      const agent = await this.getSyntheticAgentById(id);
      if (!agent) return false;

      await db.collection(FIRESTORE_COLLECTIONS.users).doc(agent.id).delete();
      const subRef = db.collection(FIRESTORE_COLLECTIONS.subscriptions).doc(agent.id);
      const subSnap = await subRef.get();
      if (subSnap.exists) {
        await subRef.delete();
      }
      return true;
    },
  };
}

export type FirestoreAdminReadRepository = ReturnType<typeof createFirestoreAdminReadRepository>;
