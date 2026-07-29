export type UserRoleTier = 'admin' | 'editor' | 'viewer';

/**
 * Maps a profile role string to one of three canonical settings access tiers:
 * - admin: Full Access (e.g. LeadInvestor, Admin, Owner)
 * - editor: Standard Access (e.g. Manager, Member, Agent, Accountant)
 * - viewer: Restricted Access (e.g. Viewer, Guest, Lender, Observer)
 */
export function getUserRoleTier(role?: string): UserRoleTier {
  if (!role) return 'viewer';
  const r = role.toLowerCase();

  // Admin Tiers
  if (
    r === 'admin' ||
    r === 'lead investor' ||
    r === 'owner/admin' ||
    r === 'platform admin' ||
    r.includes('admin') ||
    r.includes('lead') ||
    r.includes('owner') ||
    r.includes('investor')
  ) {
    return 'admin';
  }

  // Editor Tiers
  if (
    r === 'editor' ||
    r === 'team member' ||
    r === 'manager' ||
    r === 'member/contributor' ||
    r === 'contributor' ||
    r === 'general contractor' ||
    r === 'real estate agent' ||
    r === 'accountant' ||
    r.includes('editor') ||
    r.includes('manager') ||
    r.includes('contributor') ||
    r.includes('member') ||
    r.includes('agent') ||
    r.includes('contractor') ||
    r.includes('accountant')
  ) {
    return 'editor';
  }

  // Viewer / Restricted
  return 'viewer';
}
