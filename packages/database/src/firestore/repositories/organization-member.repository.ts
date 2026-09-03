import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin, FIRESTORE_COLLECTIONS } from '../admin.js';
import { organizationMemberFromFirestore } from '../converters/organization-member.converter.js';
import { FirestoreReadNotImplementedError } from '../errors.js';
import type { OrganizationMemberReadModel } from '../types/read-models.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export class FirestoreOrganizationMemberRepository {
  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {}

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberReadModel | null> {
    const db = await this.db();
    const compositeId = `${organizationId}_${userId}`;
    const direct = await db
      .collection(FIRESTORE_COLLECTIONS.organizationMembers)
      .doc(compositeId)
      .get();
    const directData = documentData(direct);
    if (directData) {
      return organizationMemberFromFirestore(direct.id, directData);
    }

    const query = await db
      .collection(FIRESTORE_COLLECTIONS.organizationMembers)
      .where('organizationId', '==', organizationId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (query.empty) return null;
    const doc = query.docs[0];
    const data = documentData(doc);
    if (!data) return null;
    return organizationMemberFromFirestore(doc.id, data);
  }

  async listForUser(userId: string): Promise<OrganizationMemberReadModel[]> {
    const query = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.organizationMembers)
      .where('userId', '==', userId)
      .get();

    return query.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [organizationMemberFromFirestore(doc.id, data)];
      } catch {
        return [];
      }
    });
  }

  create(): never {
    throw new FirestoreReadNotImplementedError('OrganizationMemberRepository.create');
  }

  update(): never {
    throw new FirestoreReadNotImplementedError('OrganizationMemberRepository.update');
  }

  delete(): never {
    throw new FirestoreReadNotImplementedError('OrganizationMemberRepository.delete');
  }
}
