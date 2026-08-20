import { projectSchema, type User, userSchema } from '@paperworking/validation';
import type { FirestoreReader } from '../types.js';

export class FirestoreUserRepository {
  constructor(private readonly db: FirestoreReader) {}

  async getValidated(uid: string): Promise<User | null> {
    const snap = await this.db.collection('users').doc(uid).get();
    if (!snap.exists) return null;

    const parsed = userSchema.safeParse({ uid: snap.id, ...snap.data() });
    if (!parsed.success) {
      throw new Error(`Firestore user "${uid}" failed validation: ${parsed.error.message}`);
    }

    return parsed.data;
  }
}

/** Re-export project schema helper for callers that need field-level mapping docs. */
export { projectSchema };
