import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { optionalString, toDate } from './converters/timestamp.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

export type TaskAssignmentRecord = {
  id: string;
  title: string;
  projectId: string;
  assigneeId: string;
  status: string;
  dueAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

function taskFromFirestore(id: string, data: Record<string, unknown>): TaskAssignmentRecord {
  const metadata =
    data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};
  return {
    id: optionalString(data.id) ?? id,
    title: optionalString(data.title) ?? '',
    projectId: optionalString(data.projectId) ?? '',
    assigneeId: optionalString(data.assigneeId) ?? '',
    status: optionalString(data.status) ?? 'open',
    dueAt: data.dueAt ? toDate(data.dueAt, 'dueAt') : null,
    metadata,
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
  };
}

/** Firestore `/taskAssignments` persistence for Nest task routes. */
export function createFirestoreTaskAssignmentsRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listByProjectId(
      projectId: string,
      assigneeId?: string,
    ): Promise<TaskAssignmentRecord[]> {
      const db = await requireFirestore(firestoreFactory);
      let query = db
        .collection(FIRESTORE_COLLECTIONS.taskAssignments)
        .where('projectId', '==', projectId);
      if (assigneeId) {
        query = query.where('assigneeId', '==', assigneeId);
      }
      const snap = await query.get();
      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        return data ? [taskFromFirestore(doc.id, data)] : [];
      });
      return rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 200);
    },

    async listForAssignee(assigneeId: string): Promise<TaskAssignmentRecord[]> {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.taskAssignments)
        .where('assigneeId', '==', assigneeId)
        .get();
      const rows = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        return data ? [taskFromFirestore(doc.id, data)] : [];
      });
      return rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 200);
    },

    async createTask(data: {
      title: string;
      projectId: string;
      assigneeId: string;
      status: string;
      dueAt?: Date;
      metadata?: Record<string, unknown>;
    }): Promise<TaskAssignmentRecord> {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload: Record<string, unknown> = {
        id,
        title: data.title,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        status: data.status,
        metadata: data.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      if (data.dueAt) payload.dueAt = data.dueAt;

      const ref = db.collection(FIRESTORE_COLLECTIONS.taskAssignments).doc(id);
      await ref.set(payload);
      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create task assignment');
      return taskFromFirestore(snap.id, stored);
    },
  };
}

export type FirestoreTaskAssignmentsRepository = ReturnType<
  typeof createFirestoreTaskAssignmentsRepository
>;
