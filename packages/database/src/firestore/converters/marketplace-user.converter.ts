import { optionalString, toDate } from './timestamp.js';

/** Matches @paperworking/services MarketplaceProfileUserRow / PublicInvestorRow fields. */
export type MarketplaceUserFields = {
  id: string;
  email: string | null;
  displayName: string | null;
  name: string | null;
  accountType: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function marketplaceUserFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): MarketplaceUserFields {
  const uid = optionalString(data.uid) ?? optionalString(data.id) ?? documentId;
  return {
    id: uid,
    email: optionalString(data.email),
    displayName: optionalString(data.displayName) ?? optionalString(data.name),
    name: optionalString(data.name) ?? optionalString(data.displayName),
    accountType: optionalString(data.accountType),
    companyName: optionalString(data.companyName),
    avatarUrl: optionalString(data.avatarUrl),
    createdAt: data.createdAt ? toDate(data.createdAt, 'createdAt') : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt, 'updatedAt') : undefined,
  };
}
