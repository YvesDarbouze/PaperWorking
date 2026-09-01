import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin, FIRESTORE_COLLECTIONS } from '../admin.js';
import { projectFromFirestore } from '../converters/project.converter.js';
import { FirestoreReadNotImplementedError } from '../errors.js';
import type { ProjectReadModel } from '../types/read-models.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export class FirestoreProjectRepository {
  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {}

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getById(id: string): Promise<ProjectReadModel | null> {
    const snap = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.projects)
      .doc(id)
      .get();
    const data = documentData(snap);
    if (!data) return null;
    return projectFromFirestore(snap.id, data);
  }

  async listByOrganization(organizationId: string): Promise<ProjectReadModel[]> {
    const query = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.projects)
      .where('organizationId', '==', organizationId)
      .get();

    return query.docs.flatMap((doc) => {
      const data = documentData(doc);
      if (!data) return [];
      try {
        return [projectFromFirestore(doc.id, data)];
      } catch {
        return [];
      }
    });
  }

  create(): never {
    throw new FirestoreReadNotImplementedError('ProjectRepository.create');
  }

  update(): never {
    throw new FirestoreReadNotImplementedError('ProjectRepository.update');
  }

  delete(): never {
    throw new FirestoreReadNotImplementedError('ProjectRepository.delete');
  }
}
