import { AuthzNotFoundError } from '@paperworking/authz';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { FirestoreOrganizationMemberRepository } from './repositories/organization-member.repository.js';
import { FirestoreProjectRepository } from './repositories/project.repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';
import { projectReadModelToStored } from './project-to-stored.js';

type ProjectCreateData = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  purchasePrice?: number;
  organizationId?: string;
  userId: string;
};

async function ensurePersonalOrganization(
  userId: string,
  organizationId: string,
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
): Promise<void> {
  const db = await requireFirestore(firestoreFactory);
  const orgRef = db.collection(FIRESTORE_COLLECTIONS.organizations).doc(organizationId);
  const orgSnap = await orgRef.get();
  const now = FieldValue.serverTimestamp();

  if (!orgSnap.exists) {
    await orgRef.set({
      id: organizationId,
      name: 'My Workspace',
      ownerUid: userId,
      ownerId: userId,
      type: 'personal',
      createdAt: now,
      updatedAt: now,
    });
  }

  const memberId = `${organizationId}_${userId}`;
  const memberRef = db.collection(FIRESTORE_COLLECTIONS.organizationMembers).doc(memberId);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    await memberRef.set({
      id: memberId,
      organizationId,
      userId,
      role: 'Lead Investor',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(userId);
  const userSnap = await userRef.get();
  const userData = documentData(userSnap);
  if (userData && !userData.personalOrganizationId) {
    await userRef.set(
      {
        personalOrganizationId: organizationId,
        updatedAt: now,
      },
      { merge: true },
    );
  }
}

/** Firestore ProjectsCommandRepository — replaces Prisma when DATABASE_READ_MODE=firestore. */
export function createFirestoreProjectsCommandRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const projects = new FirestoreProjectRepository(firestoreFactory);

  return {
    async create(data: ProjectCreateData) {
      let organizationId = data.organizationId;
      if (!organizationId) {
        organizationId = `org_me_${data.userId}`;
        await ensurePersonalOrganization(data.userId, organizationId, firestoreFactory);
      }

      const created = await projects.create({
        ...data,
        organizationId,
      });
      return projectReadModelToStored(created);
    },

    async update(id: string, patch: Record<string, unknown>) {
      try {
        const updated = await projects.update(id, patch);
        return projectReadModelToStored(updated);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('not found')) {
          throw new AuthzNotFoundError({ error: 'Project not found' });
        }
        throw error;
      }
    },
  };
}

export type FirestoreProjectsCommandRepository = ReturnType<
  typeof createFirestoreProjectsCommandRepository
>;
