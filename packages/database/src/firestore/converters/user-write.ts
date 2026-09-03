import { FieldValue } from 'firebase-admin/firestore';
import { displayNameFromEmail } from '../user-document-id.js';

export function userCreatePayload(input: {
  firebaseUid: string;
  email: string;
  accountType: string;
  displayName?: string;
}): Record<string, unknown> {
  const now = FieldValue.serverTimestamp();
  const displayName = input.displayName?.trim() || displayNameFromEmail(input.email);
  return {
    uid: input.firebaseUid,
    email: input.email,
    displayName,
    name: displayName,
    accountType: input.accountType,
    role: null,
    legacyFirebaseUid: input.firebaseUid,
    subscriptionPlan: 'Individual',
    subscriptionStatus: 'inactive',
    createdAt: now,
    updatedAt: now,
  };
}

export function userEmailUpdatePayload(email: string): Record<string, unknown> {
  return {
    email,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export function userAfterRemapPayload(input: {
  email: string;
  legacyFirebaseUid: string | null;
  firebaseUid?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    email: input.email,
    legacyFirebaseUid: input.legacyFirebaseUid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.firebaseUid) payload.uid = input.firebaseUid;
  return payload;
}
