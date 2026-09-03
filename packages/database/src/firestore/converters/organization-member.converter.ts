import { FirestoreDocumentParseError } from '../errors.js';
import type { OrganizationMemberReadModel } from '../types/read-models.js';
import { optionalString, requiredString, toDate } from './timestamp.js';

export function organizationMemberFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): OrganizationMemberReadModel {
  try {
    return {
      id: optionalString(data.id) ?? documentId,
      organizationId: requiredString(data.organizationId, 'organizationId'),
      userId: optionalString(data.userId),
      email: optionalString(data.email),
      role: optionalString(data.role) ?? 'Contributor',
      status: optionalString(data.status) ?? 'active',
      createdAt: toDate(data.createdAt, 'createdAt'),
      updatedAt: toDate(data.updatedAt, 'updatedAt'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('organizationMembers', documentId, message);
  }
}
