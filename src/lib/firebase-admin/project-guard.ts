import { adminDb } from '@/lib/firebase/admin';

export interface ProjectAccess {
  project: any;
  role: 'Lead Investor' | 'General Contractor' | 'Observer' | 'co_buyer' | 'GP' | 'LP' | 'Vendor';
  partyId?: string;
  email?: string;
  phasePermissions?: Record<string, { canView: boolean; canEdit: boolean }>;
}

/**
 * determineAccessAndRole
 *
 * Scopes user access to a project by checking memberships and role-based permissions sync.
 */
export function determineAccessAndRole(
  projectData: any,
  uid: string,
  email: string | undefined,
  orgData?: any
): ProjectAccess | null {
  // 1. Direct Owner
  if (projectData.ownerUid === uid) {
    return { project: projectData, role: 'Lead Investor' };
  }

  // 2. Direct project member (Lead Investor, GC, Observer, etc.)
  if (projectData.members && uid in projectData.members) {
    const role = projectData.members[uid].role || 'Observer';
    return {
      project: projectData,
      role: role as any,
      phasePermissions: projectData.members[uid].phasePermissions || {},
    };
  }

  // 3. Parent Organization owner/member
  if (orgData) {
    const isOrgOwner = orgData.ownerUid === uid;
    const isOrgTeamMember = orgData.teamMembers?.some(
      (m: any) => m.id === uid && m.status === 'active'
    );
    if (isOrgOwner || isOrgTeamMember) {
      return { project: projectData, role: 'Lead Investor' };
    }
  }

  // 4. Linked Equity Party (LP or co-buyer)
  if (projectData.equityParties && Array.isArray(projectData.equityParties)) {
    const party = projectData.equityParties.find(
      (p: any) =>
        p.memberId === uid ||
        (p.email && email && p.email.toLowerCase() === email.toLowerCase())
    );
    if (party) {
      return {
        project: projectData,
        role: party.role || 'LP',
        partyId: party.id,
        email: party.email,
        phasePermissions: party.phasePermissions || {},
      };
    }
  }

  // 5. Linked Vendor (assigned to team slots)
  const financials = projectData.financials || {};
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
        project: projectData,
        role: 'Vendor',
        partyId: slotKey,
        email: vendor.email,
      };
    }
  }

  return null;
}

export async function verifyProjectAccessAndRole(
  projectId: string,
  uid: string,
  email?: string
): Promise<ProjectAccess | null> {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;

  let orgData: any = null;
  if (data.organizationId) {
    const orgSnap = await adminDb.collection('organizations').doc(data.organizationId).get();
    if (orgSnap.exists) {
      orgData = orgSnap.data();
    }
  }

  return determineAccessAndRole(data, uid, email, orgData);
}

/**
 * authorizeProjectMutation
 *
 * Verifies if the resolved role/member profile is authorized to perform mutations.
 * Enforces the v1.1 matrix:
 *  - Lead Investor or General Contractor: Full write/read access.
 *  - Observer: Read-only (forbidden for any mutation).
 *  - Vendor: Write restricted only to their assigned vendor slots.
 *  - Investment Team/GP/LP/co_buyer: Permitted unless explicitly disabled in phasePermissions for the target phase.
 */
export function authorizeProjectMutation(
  access: ProjectAccess,
  phaseKey: 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4',
  options?: {
    allowVendorSlot?: string | string[]; // Slot keys (e.g. f4AppraiserVendor) that this vendor is allowed to edit
    ownRecordId?: string; // Record ID (e.g. equityParty.id) that they are allowed to edit
  }
): { authorized: boolean; error?: string; status?: number } {
  const { role, phasePermissions, partyId } = access;

  // 1. Lead Investor & General Contractor have full access
  if (role === 'Lead Investor' || role === 'General Contractor' || role === 'GP') {
    return { authorized: true };
  }

  // 2. Observer role is strictly read-only
  if (role === 'Observer') {
    return { authorized: false, error: 'Access denied: Observer is read-only.', status: 403 };
  }

  // 3. Vendor: permitted only if accessing their specific assigned slot
  if (role === 'Vendor') {
    if (options?.allowVendorSlot) {
      const allowedSlots = Array.isArray(options.allowVendorSlot)
        ? options.allowVendorSlot
        : [options.allowVendorSlot];
      if (partyId && allowedSlots.includes(partyId)) {
        return { authorized: true };
      }
    }
    return { authorized: false, error: 'Access denied: Vendor has no edit permissions for this record.', status: 403 };
  }

  // 4. Investment Team / LP / co-buyer: verify phase permission grants
  if (phasePermissions) {
    const canEdit = phasePermissions[phaseKey]?.canEdit;
    if (canEdit === false) {
      return { authorized: false, error: `Access denied: Edit permission disabled for ${phaseKey}.`, status: 403 };
    }
  }

  // Check own record id constraints if applicable
  if (options?.ownRecordId && partyId && partyId === options.ownRecordId) {
    return { authorized: true };
  }

  // For other endpoints that require mutations, if not explicitly denied by phase permissions, default is allowed
  return { authorized: true };
}
