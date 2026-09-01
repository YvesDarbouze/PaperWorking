import { FirestoreDocumentParseError } from '../errors.js';
import type { OrganizationReadModel } from '../types/read-models.js';
import { optionalString, toDate } from './timestamp.js';

export function organizationFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): OrganizationReadModel {
  try {
    return {
      id: optionalString(data.id) ?? documentId,
      name: optionalString(data.name) ?? documentId,
      slug: optionalString(data.slug),
      ownerId: optionalString(data.ownerId) ?? optionalString(data.ownerUid),
      settings:
        data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
          ? (data.settings as Record<string, unknown>)
          : null,
      createdAt: toDate(data.createdAt, 'createdAt'),
      updatedAt: toDate(data.updatedAt, 'updatedAt'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('organizations', documentId, message);
  }
}
