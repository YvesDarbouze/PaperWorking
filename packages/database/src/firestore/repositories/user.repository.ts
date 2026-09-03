import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin, FIRESTORE_COLLECTIONS } from '../admin.js';
import { userFromFirestore } from '../converters/user.converter.js';
import { FirestoreReadNotImplementedError } from '../errors.js';
import type { UserReadModel } from '../types/read-models.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './firestore-access.js';

export class FirestoreUserRepository {
  constructor(private readonly firestoreFactory: FirestoreClientFactory = getFirestoreAdmin) {}

  private async db(): Promise<Firestore> {
    return requireFirestore(this.firestoreFactory);
  }

  async getById(uid: string): Promise<UserReadModel | null> {
    const snap = await (await this.db())
      .collection(FIRESTORE_COLLECTIONS.users)
      .doc(uid)
      .get();
    const data = documentData(snap);
    if (!data) return null;
    return userFromFirestore(snap.id, data);
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
