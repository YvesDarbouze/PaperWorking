import type { AuthzStore } from '@paperworking/authz';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { organizationFromFirestore } from './converters/organization.converter.js';
import { optionalString } from './converters/timestamp.js';
import { FirestoreOrganizationMemberRepository } from './repositories/organization-member.repository.js';
import { FirestoreProjectRepository } from './repositories/project.repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import { projectReadModelToStored } from './project-to-stored.js';

/** Firestore AuthzStore — project/org ACL without Neon. */
export function createFirestoreAuthzStore(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
): AuthzStore {
  const projects = new FirestoreProjectRepository(firestoreFactory);
  const orgMembers = new FirestoreOrganizationMemberRepository(firestoreFactory);

  return {
    async findOrganizationsOwnedBy(userId) {
      const db = await requireFirestore(firestoreFactory);
      const col = db.collection(FIRESTORE_COLLECTIONS.organizations);
      const seen = new Set<string>();

      for (const field of ['ownerUid', 'ownerId'] as const) {
        const snap = await col.where(field, '==', userId).get();
        for (const doc of snap.docs) {
          seen.add(doc.id);
        }
      }

      return [...seen].map((id) => ({ id }));
    },

    async findActiveOrgMemberships(userId) {
      const memberships = await orgMembers.listForUser(userId);
      return memberships
        .filter((row: { status: string }) => row.status === 'active')
        .map((row: { organizationId: string }) => ({ organizationId: row.organizationId }));
    },

    async findProjectById(projectId) {
      const project = await projects.getById(projectId);
      if (!project) return null;
      return projectReadModelToStored(project);
    },

    async findActiveProjectMember(projectId, userId, email) {
      const db = await requireFirestore(firestoreFactory);
      const col = db.collection(FIRESTORE_COLLECTIONS.projectMembers);
      const directId = `${projectId}_${userId}`;
      const direct = await col.doc(directId).get();
      const directData = documentData(direct);
      if (directData && optionalString(directData.status) === 'active') {
        return { id: direct.id };
      }

      const byUser = await col
        .where('projectId', '==', projectId)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!byUser.empty) {
        return { id: byUser.docs[0].id };
      }

      if (email) {
        const byEmail = await col
          .where('projectId', '==', projectId)
          .where('email', '==', email.trim().toLowerCase())
          .where('status', '==', 'active')
          .limit(1)
          .get();
        if (!byEmail.empty) {
          return { id: byEmail.docs[0].id };
        }
      }

      const project = await projects.getById(projectId);
      const members = project
        ? ((await db.collection(FIRESTORE_COLLECTIONS.projects).doc(projectId).get()).data()
            ?.members as Record<string, unknown> | undefined)
        : undefined;
      if (members && members[userId]) {
        return { id: `${projectId}_${userId}` };
      }

      return null;
    },

    async findDealById(dealId) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.dealListings).doc(dealId).get();
      const data = documentData(snap);
      if (!data) return null;
      return {
        id: snap.id,
        creatorId: optionalString(data.creatorId) ?? optionalString(data.ownerUid) ?? '',
        visibility: optionalString(data.visibility) ?? 'private',
        status: optionalString(data.status) ?? 'draft',
      };
    },

    async findActiveProjectMemberByUserId(projectId, userId) {
      return this.findActiveProjectMember(projectId, userId);
    },

    async findActiveOrgMember(organizationId, userId) {
      const membership = await orgMembers.getMembership(organizationId, userId);
      if (!membership || membership.status !== 'active') return null;
      return { role: membership.role };
    },

    async findOrganizationOwnedBy(organizationId, ownerId) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.organizations).doc(organizationId).get();
      const data = documentData(snap);
      if (!data) return null;
      const org = organizationFromFirestore(snap.id, data);
      if (org.ownerId === ownerId) {
        return { id: org.id };
      }
      return null;
    },

    async findActiveOrgMemberInOrgs(userId, organizationIds) {
      if (organizationIds.length === 0) return null;
      for (const organizationId of organizationIds) {
        const membership = await orgMembers.getMembership(organizationId, userId);
        if (membership?.status === 'active') {
          return { userId };
        }
      }
      return null;
    },

    async findOrganizationOwnedByUserInOrgs(ownerId, organizationIds) {
      if (organizationIds.length === 0) return null;
      const db = await requireFirestore(firestoreFactory);
      for (const organizationId of organizationIds) {
        const snap = await db.collection(FIRESTORE_COLLECTIONS.organizations).doc(organizationId).get();
        const data = documentData(snap);
        if (!data) continue;
        const org = organizationFromFirestore(snap.id, data);
        if (org.ownerId === ownerId) {
          return { ownerId };
        }
      }
      return null;
    },

    async findMessageInThreadForUser(threadId, userId) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.messages)
        .where('threadId', '==', threadId)
        .where('senderId', '==', userId)
        .limit(1)
        .get();
      if (!snap.empty) return { id: snap.docs[0].id };

      const received = await db
        .collection(FIRESTORE_COLLECTIONS.messages)
        .where('threadId', '==', threadId)
        .where('recipientId', '==', userId)
        .limit(1)
        .get();
      if (!received.empty) return { id: received.docs[0].id };
      return null;
    },

    async findAnyMessageInThread(threadId) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db
        .collection(FIRESTORE_COLLECTIONS.messages)
        .where('threadId', '==', threadId)
        .limit(1)
        .get();
      if (snap.empty) return null;
      return { id: snap.docs[0].id };
    },
  };
}
