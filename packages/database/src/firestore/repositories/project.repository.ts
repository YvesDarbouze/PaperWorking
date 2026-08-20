import { projectSchema, type Project } from '@paperworking/validation';
import type { FirestoreReader, FirestoreProjectDocument } from '../types.js';

export class FirestoreProjectRepository {
  constructor(private readonly db: FirestoreReader) {}

  /** Raw Firestore document — no Zod validation. */
  async getRaw(projectId: string): Promise<FirestoreProjectDocument | null> {
    const snap = await this.db.collection('projects').doc(projectId).get();
    if (!snap.exists) return null;

    return {
      id: snap.id,
      data: snap.data() as Record<string, unknown>,
    };
  }

  /** Validated project document using canonical Zod schema from @paperworking/validation. */
  async getValidated(projectId: string): Promise<Project | null> {
    const raw = await this.getRaw(projectId);
    if (!raw) return null;

    const parsed = projectSchema.safeParse({ id: raw.id, ...raw.data });
    if (!parsed.success) {
      throw new Error(
        `Firestore project "${projectId}" failed validation: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  }
}
