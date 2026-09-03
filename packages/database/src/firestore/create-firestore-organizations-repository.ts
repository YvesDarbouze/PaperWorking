import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { organizationFromFirestore } from './converters/organization.converter.js';
import { organizationMemberToRecord } from './converters/organization-member-record.converter.js';
import { organizationMemberFromFirestore } from './converters/organization-member.converter.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || `org-${Date.now().toString(36)}`;
}

/** Firestore organizations CRUD for Nest /api/organizations. */
export function createFirestoreOrganizationsRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  return {
    async listByIds(ids: string[]) {
      if (ids.length === 0) return [];
      const db = await requireFirestore(firestoreFactory);
      const rows = await Promise.all(
        ids.map(async (id) => {
          const snap = await db.collection(FIRESTORE_COLLECTIONS.organizations).doc(id).get();
          const data = documentData(snap);
          return data ? organizationFromFirestore(snap.id, data) : null;
        }),
      );
      return rows.filter((row): row is NonNullable<typeof row> => row !== null);
    },

    async getById(id: string) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.organizations).doc(id).get();
      const data = documentData(snap);
      if (!data) return null;
      return organizationFromFirestore(snap.id, data);
    },

    async createWithOwner(input: {
      name: string;
      slug?: string;
      ownerId: string;
      ownerEmail?: string;
    }) {
      const db = await requireFirestore(firestoreFactory);
      let slug = (input.slug?.trim() || slugifyName(input.name)).toLowerCase();
      const slugSnap = await db
        .collection(FIRESTORE_COLLECTIONS.organizations)
        .where('slug', '==', slug)
        .limit(1)
        .get();
      if (!slugSnap.empty) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }

      const orgId = randomUUID();
      const memberId = `${orgId}_${input.ownerId}`;
      const now = FieldValue.serverTimestamp();

      await db.runTransaction(async (tx) => {
        const orgRef = db.collection(FIRESTORE_COLLECTIONS.organizations).doc(orgId);
        const memberRef = db.collection(FIRESTORE_COLLECTIONS.organizationMembers).doc(memberId);
        tx.set(orgRef, {
          id: orgId,
          name: input.name,
          slug,
          ownerId: input.ownerId,
          ownerUid: input.ownerId,
          createdAt: now,
          updatedAt: now,
        });
        tx.set(memberRef, {
          id: memberId,
          organizationId: orgId,
          userId: input.ownerId,
          email: input.ownerEmail?.trim().toLowerCase(),
          role: 'Owner',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      });

      const organization = await this.getById(orgId);
      const memberSnap = await db
        .collection(FIRESTORE_COLLECTIONS.organizationMembers)
        .doc(memberId)
        .get();
      const memberData = documentData(memberSnap);
      const membership = memberData
        ? organizationMemberToRecord(organizationMemberFromFirestore(memberSnap.id, memberData))
        : null;

      if (!organization || !membership) {
        throw new Error('Failed to bootstrap organization');
      }

      return { organization, membership };
    },
  };
}

export type FirestoreOrganizationsRepository = ReturnType<
  typeof createFirestoreOrganizationsRepository
>;
