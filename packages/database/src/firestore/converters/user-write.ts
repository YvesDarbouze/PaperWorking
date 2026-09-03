import { FieldValue } from 'firebase-admin/firestore';

export function userCreatePayload(input: {
  id: string;
  email: string;
  accountType: string;
}): Record<string, unknown> {
  const now = FieldValue.serverTimestamp();
  return {
    uid: input.id,
    email: input.email,
    accountType: input.accountType,
    role: null,
    legacyFirebaseUid: input.id,
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
}): Record<string, unknown> {
  return {
    email: input.email,
    legacyFirebaseUid: input.legacyFirebaseUid,
    updatedAt: FieldValue.serverTimestamp(),
  };
}
