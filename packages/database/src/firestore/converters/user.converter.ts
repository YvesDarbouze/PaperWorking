import { FirestoreDocumentParseError } from '../errors.js';
import type { UserReadModel } from '../types/read-models.js';
import { optionalString, toDate } from './timestamp.js';

/** Tolerates missing or malformed timestamp fields on partially-written user documents. */
function safeDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  try {
    return toDate(value, 'timestamp');
  } catch {
    return null;
  }
}

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
      subscriptionPlan: optionalString(data.subscriptionPlan),
      subscriptionStatus: optionalString(data.subscriptionStatus),
      stripeSubscriptionId: optionalString(data.stripeSubscriptionId),
      createdAt: safeDate(data.createdAt) ?? safeDate(data.updatedAt) ?? new Date(0),
      updatedAt: safeDate(data.updatedAt) ?? safeDate(data.createdAt) ?? new Date(0),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('users', documentId, message);
  }
}
