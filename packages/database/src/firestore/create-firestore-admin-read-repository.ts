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
    documentId: row.id,
    email: optionalString(row.data.email) ?? (row.id.includes('@') ? row.id : ''),
    name: optionalString(row.data.name),
    displayName: optionalString(row.data.displayName),
    accountType: optionalString(row.data.accountType),
    jobTitle: optionalString(row.data.role),
    orgRole: optionalString(row.data.orgRole),
    createdAt,
  };
}

async function findUserRowByLookupId(
  db: Firestore,
  lookupId: string,
): Promise<ReturnType<typeof userListRow> | null> {
  const trimmed = lookupId.trim();
  if (!trimmed) return null;

  const direct = await db.collection(FIRESTORE_COLLECTIONS.users).doc(trimmed).get();
  if (direct.exists) {
    const data = documentData(direct);
    if (data) return userListRow({ id: direct.id, data });
  }

  for (const field of ['uid', 'email'] as const) {
    const value = field === 'email' ? trimmed.toLowerCase() : trimmed;
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.users)
      .where(field, '==', value)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) continue;
    const data = documentData(doc);
    if (data) return userListRow({ id: doc.id, data });
  }

  return null;
}

function buildUserProfileIndex(userRows: DocRow[]) {
  const index = new Map<string, { email: string; displayName: string }>();

  for (const row of userRows) {
    const docEmail = row.id.includes('@') ? row.id : '';
    const email = (optionalString(row.data.email) ?? docEmail).trim().toLowerCase();
    const displayName =
      (optionalString(row.data.displayName) ?? optionalString(row.data.name) ?? '').trim();
    const profile = { email, displayName };

    const keys = new Set<string>([row.id]);
    const uid = optionalString(row.data.uid);
    const legacy = optionalString(row.data.legacyFirebaseUid);
    if (uid) keys.add(uid);
    if (legacy) keys.add(legacy);
    if (email) keys.add(email);

    for (const key of keys) {
      if (key) index.set(key, profile);
    }
  }

  return index;
}

function projectListRow(row: DocRow) {
  return {
    id: row.id,
    name:
      optionalString(row.data.name) ??
      optionalString(row.data.projectName) ??
      optionalString(row.data.title) ??
      row.id,
    ownerId:
      optionalString(row.data.userId) ??
      optionalString(row.data.ownerId) ??
      optionalString(row.data.investorId) ??
      '',
    status: optionalString(row.data.status) ?? 'unknown',
    createdAt: optionalDate(row.data.createdAt) ?? new Date(0),
    updatedAt:
      optionalDate(row.data.updatedAt) ?? optionalDate(row.data.createdAt) ?? new Date(0),
  };
}

function organizationListRow(row: DocRow, memberCount: number) {
  return {
    id: row.id,
    name:
      optionalString(row.data.name) ??
      optionalString(row.data.displayName) ??
      optionalString(row.data.organizationName) ??
      row.id,
    ownerId:
      optionalString(row.data.ownerId) ??
      optionalString(row.data.userId) ??
      optionalString(row.data.createdBy) ??
      '',
    memberCount,
    createdAt: optionalDate(row.data.createdAt) ?? new Date(0),
  };
}

function auditRow(row: DocRow) {
  const metadata =
    row.data.metadata && typeof row.data.metadata === 'object' && !Array.isArray(row.data.metadata)
      ? (row.data.metadata as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    timestamp: optionalDate(row.data.timestamp) ?? optionalDate(row.data.createdAt) ?? new Date(0),
    actorEmail: optionalString(row.data.actorEmail) ?? '',
    action: optionalString(row.data.action) ?? '',
    targetResource: optionalString(row.data.targetResource) ?? '',
    targetResourceId: optionalString(row.data.targetResourceId),
    status: optionalString(row.data.status) ?? 'unknown',
    entryHash: optionalString(row.data.entryHash) ?? '',
    ip: optionalString(metadata.ip) ?? optionalString(row.data.ip) ?? '—',
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

    async countOrganizations() {
      const db = await requireFirestore(firestoreFactory);
      return countCollection(db, FIRESTORE_COLLECTIONS.organizations);
    },

    async countListings() {
      const db = await requireFirestore(firestoreFactory);
      return countCollection(db, FIRESTORE_COLLECTIONS.dealListings);
    },

    async countVendors() {
      const db = await requireFirestore(firestoreFactory);
      const vendorDocs = await countCollection(db, FIRESTORE_COLLECTIONS.vendors);
      if (vendorDocs > 0) return vendorDocs;

      const users = await listCollectionRows(db, FIRESTORE_COLLECTIONS.users);
      return users.filter(
        (row) => optionalString(row.data.accountType)?.trim().toLowerCase() === 'vendor',
      ).length;
    },

    async listRecentUsers(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const rows = sortRowsByFieldDesc(
        await listCollectionRows(db, FIRESTORE_COLLECTIONS.users),
        'createdAt',
      );
      return rows.slice(0, limit).map(userListRow);
    },

    async findUserByLookupId(lookupId: string) {
      const db = await requireFirestore(firestoreFactory);
      return findUserRowByLookupId(db, lookupId);
    },

    async listRecentProjects(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const rows = sortRowsByFieldDesc(
        await listCollectionRows(db, FIRESTORE_COLLECTIONS.projects),
        'updatedAt',
      );
      return rows.slice(0, limit).map(projectListRow);
    },

    async listRecentOrganizations(limit: number) {
      const db = await requireFirestore(firestoreFactory);
      const [orgRows, memberRows] = await Promise.all([
        sortRowsByFieldDesc(
          await listCollectionRows(db, FIRESTORE_COLLECTIONS.organizations),
          'createdAt',
        ),
        listCollectionRows(db, FIRESTORE_COLLECTIONS.organizationMembers),
      ]);
      const memberCounts = new Map<string, number>();
      for (const row of memberRows) {
        const orgId = optionalString(row.data.organizationId);
        if (!orgId) continue;
        memberCounts.set(orgId, (memberCounts.get(orgId) ?? 0) + 1);
      }
      return orgRows.slice(0, limit).map((row) => organizationListRow(row, memberCounts.get(row.id) ?? 0));
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
      const [rows, userRows] = await Promise.all([
        sortRowsByFieldDesc(
          await listCollectionRows(db, FIRESTORE_COLLECTIONS.subscriptions),
          'updatedAt',
        ),
        listCollectionRows(db, FIRESTORE_COLLECTIONS.users),
      ]);
      const userIndex = buildUserProfileIndex(userRows);

      return rows.slice(0, limit).map((row) => {
        const userId =
          optionalString(row.data.userId) ?? optionalString(row.data.uid) ?? row.id;
        const customer = userIndex.get(userId) ?? { email: '', displayName: '' };
        return {
          id: optionalString(row.data.id) ?? row.id,
          status: optionalString(row.data.status),
          plan: optionalString(row.data.plan),
          userId,
          customerEmail: customer.email,
          customerName: customer.displayName,
          updatedAt: optionalDate(row.data.updatedAt) ?? new Date(0),
        };
      });
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
        status: optionalString(row.data.status),
        visibility: optionalString(row.data.visibility),
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
