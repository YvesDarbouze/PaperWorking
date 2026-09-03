import { optionalString } from './timestamp.js';

/** Matches @paperworking/services ProfileUserRow (avoid circular package deps). */
export type ProfileUserRecord = {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  phone: string | null;
  timezone: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  role: string | null;
  settings: unknown;
};

export function profileUserFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): ProfileUserRecord {
  const uid = optionalString(data.uid) ?? optionalString(data.id) ?? documentId;
  const preferences =
    data.preferences && typeof data.preferences === 'object'
      ? (data.preferences as Record<string, unknown>)
      : null;
  const settings =
    data.settings && typeof data.settings === 'object'
      ? data.settings
      : preferences && Object.keys(preferences).length
        ? preferences
        : null;

  return {
    id: uid,
    email: optionalString(data.email) ?? '',
    name: optionalString(data.name) ?? optionalString(data.displayName),
    displayName: optionalString(data.displayName) ?? optionalString(data.name),
    phone: optionalString(data.phone),
    timezone:
      optionalString(data.timezone) ??
      (preferences ? optionalString(preferences.timezone) : null),
    companyName: optionalString(data.companyName),
    avatarUrl: optionalString(data.avatarUrl) ?? optionalString(data.photoURL),
    accountType: optionalString(data.accountType),
    role: optionalString(data.role),
    settings,
  };
}
