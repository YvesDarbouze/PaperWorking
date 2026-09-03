import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin, FIRESTORE_COLLECTIONS } from '../admin.js';
import { organizationFromFirestore } from '../converters/organization.converter.js';
import { FirestoreReadNotImplementedError } from '../errors.js';
import type { OrganizationReadModel } from '../types/read-models.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export class FirestoreOrganizationRepository {
  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {}

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getById(id: string): Promise<OrganizationReadModel | null> {
    const snap = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.organizations)
      .doc(id)
      .get();
    const data = documentData(snap);
    if (!data) return null;
    return organizationFromFirestore(snap.id, data);
  }

  create(): never {
    throw new FirestoreReadNotImplementedError('OrganizationRepository.create');
  }

  update(): never {
    throw new FirestoreReadNotImplementedError('OrganizationRepository.update');
  }

  delete(): never {
    throw new FirestoreReadNotImplementedError('OrganizationRepository.delete');
  }
}
