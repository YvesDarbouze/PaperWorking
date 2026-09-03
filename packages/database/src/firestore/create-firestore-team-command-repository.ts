import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { organizationMemberFromFirestore } from './converters/organization-member.converter.js';
import { organizationMemberToRecord } from './converters/organization-member-record.converter.js';
import { organizationInviteFromFirestore } from './converters/organization-invite.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

type CreateMemberData = {
  organizationId: string;
  userId?: string;
  email?: string;
  role: string;
  status: string;
};

type CreateInviteData = {
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string;
};

type UpdateMemberData = {
  role?: string;
  status?: string;
};

function resolveMemberId(organizationId: string, userId?: string): string {
  if (userId) return `${organizationId}_${userId}`;
  return randomUUID();
}

function sortByCreatedAtDesc<T extends { createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Firestore TeamCommandRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreTeamCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async findMemberById(id: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.organizationMembers).doc(id).get();
      const data = documentData(snap);
      if (!data) return null;
      return organizationMemberToRecord(organizationMemberFromFirestore(snap.id, data));
    },

    async createMember(data: CreateMemberData) {
      const db = await requireFirestore(firestoreFactory);
      const id = resolveMemberId(data.organizationId, data.userId);
      const now = FieldValue.serverTimestamp();
      const payload: Record<string, unknown> = {
        id,
        organizationId: data.organizationId,
        role: data.role,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };
      if (data.userId) payload.userId = data.userId;
      if (data.email) payload.email = data.email;

      const ref = db.collection(FIRESTORE_COLLECTIONS.organizationMembers).doc(id);
      await ref.set(payload);

      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create organization member');
      return organizationMemberToRecord(organizationMemberFromFirestore(snap.id, stored));
    },

    async updateMember(id: string, data: UpdateMemberData) {
      const db = await requireFirestore(firestoreFactory);
      const ref = db.collection(FIRESTORE_COLLECTIONS.organizationMembers).doc(id);
      const update: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (typeof data.role === 'string') update.role = data.role;
      if (typeof data.status === 'string') update.status = data.status;
      await ref.set(update, { merge: true });

      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Organization member not found after update');
      return organizationMemberToRecord(organizationMemberFromFirestore(snap.id, stored));
    },

    async deleteMember(id: string) {
      const db = await requireFirestore(firestoreFactory);
      await db.collection(FIRESTORE_COLLECTIONS.organizationMembers).doc(id).delete();
    },

    async listInvitesByOrganizationId(organizationId: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.organizationInvites)
        .where('organizationId', '==', organizationId)
        .get();

      const invites = snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        try {
          return [organizationInviteFromFirestore(doc.id, data)];
        } catch {
          return [];
        }
      });

      return sortByCreatedAtDesc(invites);
    },

    async createInvite(data: CreateInviteData) {
      const db = await requireFirestore(firestoreFactory);
      const id = randomUUID();
      const now = FieldValue.serverTimestamp();
      const payload = {
        id,
        organizationId: data.organizationId,
        email: data.email,
        role: data.role,
        invitedBy: data.invitedBy,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const ref = db.collection(FIRESTORE_COLLECTIONS.organizationInvites).doc(id);
      await ref.set(payload);

      const snap = await ref.get();
      const stored = documentData(snap);
      if (!stored) throw new Error('Failed to create organization invite');
      return organizationInviteFromFirestore(snap.id, stored);
    },
  };
}

export type FirestoreTeamCommandRepository = ReturnType<
  typeof createFirestoreTeamCommandRepository
>;
