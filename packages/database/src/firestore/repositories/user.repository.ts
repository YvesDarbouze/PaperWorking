import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin, FIRESTORE_COLLECTIONS } from '../admin.js';
import { userFromFirestore } from '../converters/user.converter.js';
import { FirestoreReadNotImplementedError } from '../errors.js';
import type { UserReadModel } from '../types/read-models.js';
import { requireFirestore, type FirestoreClientFactory } from './firestore-access.js';
import { resolveUserDocumentByFirebaseUid } from '../user-doc-resolver.js';

export class FirestoreUserRepository {
  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {}

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getById(uid: string): Promise<UserReadModel | null> {
    const db = await this.db();
    const resolved = await resolveUserDocumentByFirebaseUid(db, uid);
    if (!resolved) return null;
    return userFromFirestore(resolved.documentId, resolved.data);
  }

  create(): never {
    throw new FirestoreReadNotImplementedError('UserRepository.create');
  }

  update(): never {
    throw new FirestoreReadNotImplementedError('UserRepository.update');
  }

  delete(): never {
    throw new FirestoreReadNotImplementedError('UserRepository.delete');
  }
}
