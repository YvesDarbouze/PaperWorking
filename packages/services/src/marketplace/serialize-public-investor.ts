import type { PublicInvestorRow } from './marketplace-investors-read-repository.js';

/** Public DTO — email deliberately omitted. */
export function serializePublicInvestor(inv: PublicInvestorRow) {
  return {
    id: inv.id,
    name: inv.name,
    displayName: inv.displayName,
    companyName: inv.companyName,
    avatarUrl: inv.avatarUrl,
    accountType: inv.accountType,
  };
}

/** UI directory card shape (legacy handler compat). */
export function serializeInvestorProfileCard(inv: PublicInvestorRow) {
  return {
    uid: inv.id,
    id: inv.id,
    displayName: inv.displayName || inv.name || 'Investor',
    companyName: inv.companyName,
    avatarUrl: inv.avatarUrl,
    accountType: inv.accountType,
    publicProfile: true,
  };
}
