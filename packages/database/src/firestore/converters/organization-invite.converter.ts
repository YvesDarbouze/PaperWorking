import { FirestoreDocumentParseError } from '../errors.js';
import { optionalString, requiredString, toDate } from './timestamp.js';

/** Matches @paperworking/services OrganizationInviteRecord (avoid circular package deps). */
export type OrganizationInviteRecord = {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Maps Firestore `/organizationInvites/{invitationId}` to the Prisma-aligned service record. */
export function organizationInviteFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): OrganizationInviteRecord {
  try {
    return {
      id: optionalString(data.id) ?? documentId,
      organizationId: requiredString(data.organizationId, 'organizationId'),
      email: requiredString(data.email, 'email'),
      role: optionalString(data.role) ?? 'Contributor',
      invitedBy: optionalString(data.invitedBy),
      status: optionalString(data.status) ?? 'pending',
      createdAt: toDate(data.createdAt, 'createdAt'),
      updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('organizationInvites', documentId, message);
  }
}
