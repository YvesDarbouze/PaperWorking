import { FirestoreDocumentParseError } from '../errors.js';
import type { UserReadModel } from '../types/read-models.js';
import { optionalString, toDate } from './timestamp.js';

export function userFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): UserReadModel {
  try {
    const uid = optionalString(data.uid) ?? documentId;
    return {
      id: uid,
      email: optionalString(data.email),
      name: optionalString(data.name) ?? optionalString(data.displayName),
      displayName: optionalString(data.displayName) ?? optionalString(data.name),
      accountType: optionalString(data.accountType),
      role: optionalString(data.role),
      personalOrganizationId:
        optionalString(data.personalOrganizationId) ?? optionalString(data.organizationId),
      legacyFirebaseUid: optionalString(data.legacyFirebaseUid),
      createdAt: toDate(data.createdAt, 'createdAt'),
      updatedAt: toDate(data.updatedAt, 'updatedAt'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('users', documentId, message);
  }
}
