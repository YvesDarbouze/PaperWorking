import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { optionalString, toDate } from './converters/timestamp.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

export type ProjectMemberRecord = {
  id: string;
  projectId: string;
  userId: string | null;
  email: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function memberFromFirestore(id: string, data: Record<string, unknown>): ProjectMemberRecord {
  return {
    id: optionalString(data.id) ?? id,
    projectId: optionalString(data.projectId) ?? '',
    userId: optionalString(data.userId),
    email: optionalString(data.email),
    role: optionalString(data.role) ?? 'member',
    status: optionalString(data.status) ?? 'active',
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
  };
}

/** Firestore projectMembers persistence for Nest /api/project-members. */
export function createFirestoreProjectMembersRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listByProjectId(projectId: string): Promise<ProjectMemberRecord[]> {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.projectMembers)
        .where('projectId', '==', projectId)
        .get();

      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        return data ? [memberFromFirestore(doc.id, data)] : [];
      });

      return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 200);
    },

    async createMember(data: {
      projectId: string;
      userId?: string;
      email?: string;
      role: string;
      status: string;
    }): Promise<ProjectMemberRecord> {
      const db = await requireFirestore(firestoreFactory);
      const id = data.userId ? `${data.projectId}_${data.userId}` : randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload: Record<string, unknown> = {
        id,
        projectId: data.projectId,
        role: data.role,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };
      if (data.userId) payload.userId = data.userId;
      if (data.email) payload.email = data.email.trim().toLowerCase();

      const ref = db.collection(FIRESTORE_COLLECTIONS.projectMembers).doc(id);
      await ref.set(payload, { merge: true });
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create project member');
      return memberFromFirestore(snap.id, stored);
    },
  };
}

export type FirestoreProjectMembersRepository = ReturnType<
  typeof createFirestoreProjectMembersRepository
>;
