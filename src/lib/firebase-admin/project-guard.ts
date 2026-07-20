import { adminDb } from '@/lib/firebase/admin';

export interface ProjectAccess {
  project: any;
  role: 'Lead Investor' | 'co_buyer' | 'GP' | 'LP' | 'Vendor';
  partyId?: string;
  email?: string;
  phasePermissions?: Record<string, { canView: boolean; canEdit: boolean }>;
}

/**
 * verifyProjectAccessAndRole
 *
 * Scopes user access to a project by checking memberships and role-based permissions.
 * Matches:
 *  1. Project ownerUid (Owner/Lead Investor)
 *  2. Members mapping table (direct project role)
 *  3. Organization parent membership
 *  4. Linked equity parties (where memberId or email matches user uid/email)
 */
export async function verifyProjectAccessAndRole(
  projectId: string,
  uid: string,
  email?: string
): Promise<ProjectAccess | null> {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;

  // 1. Direct Owner
  if (data.ownerUid === uid) {
    return { project: data, role: 'Lead Investor' };
  }

  // 2. Direct project member (Lead Investor, GC, Observer, etc.)
  if (data.members && uid in data.members) {
    const role = data.members[uid].role || 'Observer';
    if (role === 'Lead Investor' || role === 'General Contractor') {
      return { project: data, role: role as any };
    }
  }

  // 3. Parent Organization owner/member
  if (data.organizationId) {
    const orgSnap = await adminDb.collection('organizations').doc(data.organizationId).get();
    if (orgSnap.exists) {
      const orgData = orgSnap.data()!;
      const isOrgOwner = orgData.ownerUid === uid;
      const isOrgTeamMember = orgData.teamMembers?.some(
        (m: any) => m.id === uid && m.status === 'active'
      );
      if (isOrgOwner || isOrgTeamMember) {
        return { project: data, role: 'Lead Investor' };
      }
    }
  }

  // 4. Linked Equity Party (LP or co-buyer)
  if (data.equityParties && Array.isArray(data.equityParties)) {
    const party = data.equityParties.find(
      (p: any) =>
        p.memberId === uid ||
        (p.email && email && p.email.toLowerCase() === email.toLowerCase())
    );
    if (party) {
      return {
        project: data,
        role: party.role || 'LP',
        partyId: party.id,
        email: party.email,
        phasePermissions: party.phasePermissions || {},
      };
    }
  }

  // 5. Linked Vendor (assigned to team slots)
  const financials = data.financials || {};
  const vendorSlotKeys = [
    'f4TitleEscrowVendor',
    'f4ClosingAttorneyVendor',
    'f4AppraiserVendor',
    'f4EnvironmentalVendor',
    'f4SurveyorVendor',
    'f4InsuranceBrokerVendor',
    'f4CdcVendor',
    'f4HardMoneyLenderVendor',
  ] as const;

  for (const slotKey of vendorSlotKeys) {
    const vendor = financials[slotKey];
    if (vendor && (
      vendor.marketplaceVendorId === uid ||
      (vendor.email && email && vendor.email.toLowerCase() === email.toLowerCase())
    )) {
      return {
        project: data,
        role: 'Vendor',
        partyId: slotKey,
        email: vendor.email,
      };
    }
  }

  return null;
}
