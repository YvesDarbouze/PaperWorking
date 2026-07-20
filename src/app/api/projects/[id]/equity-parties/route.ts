import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import type { EquityParty, CapitalSource } from '@/types/schema';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  // Authenticate Caller
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  const projectRef = adminDb.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  const projectData = projectSnap.data()!;

  // Tenant/Org data isolation check
  const userSnap = await adminDb.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }
  const profile = userSnap.data()!;
  const orgId = projectData.organizationId;
  const hasAccess =
    profile.personalOrganizationId === orgId ||
    profile.organizationId === orgId ||
    (profile.memberships != null && Boolean(profile.memberships[orgId]));

  if (!hasAccess) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  let equityParties: EquityParty[] = projectData.equityParties || [];

  // GP role default: for syndication modality, default Lead Investor to GP
  const isSyndicated = projectData.fundingPlan?.modality?.includes('syndication_equity') ||
                       projectData.financials?.financingType === 'Syndicated';

  if (isSyndicated && !equityParties.some(p => p.role === 'GP')) {
    const leadInvestorParty: EquityParty = {
      id: `party_gp_${uid}`,
      projectId,
      role: 'GP',
      name: profile.displayName || profile.name || 'Lead Investor',
      email: profile.email || null,
      entityType: 'Individual',
      memberId: uid,
      ownershipPct: 0,
      phasePermissions: {
        'phase-1': { canView: true, canEdit: true },
        'phase-2': { canView: true, canEdit: true },
        'phase-3': { canView: true, canEdit: true },
        'phase-4': { canView: true, canEdit: true },
      }
    };
    equityParties = [leadInvestorParty, ...equityParties];
    // Sync back to db
    await projectRef.update({ equityParties });
  }

  return NextResponse.json({ success: true, equityParties });
}

export async function POST(req: NextRequest, { params }: Params) {
  // Authenticate Caller
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  let body: {
    action: 'save' | 'delete';
    party?: Partial<EquityParty>;
    partyId?: string;
    gpCoInvestAmount?: number; // Optional co-invest amount to sync to CapitalSource
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, party, partyId, gpCoInvestAmount } = body;

  const projectRef = adminDb.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  const projectData = projectSnap.data()!;

  // Tenant/Org data isolation check
  const userSnap = await adminDb.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }
  const profile = userSnap.data()!;
  const orgId = projectData.organizationId;
  const hasAccess =
    profile.personalOrganizationId === orgId ||
    profile.organizationId === orgId ||
    (profile.memberships != null && Boolean(profile.memberships[orgId]));

  if (!hasAccess) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  // Only project-level Lead Investors/Admins or owner can edit the roster
  const isLead =
    projectData.ownerUid === uid ||
    projectData.members?.[uid]?.role === 'Lead Investor' ||
    profile.role === 'Lead Investor' ||
    profile.role === 'Admin';

  if (!isLead) {
    return NextResponse.json({ success: false, error: 'Forbidden: Lead Investor permissions required' }, { status: 403 });
  }

  let equityParties: EquityParty[] = projectData.equityParties || [];

  if (action === 'save') {
    if (!party || !party.name || !party.role) {
      return NextResponse.json({ success: false, error: 'Name and Role are required' }, { status: 400 });
    }

    const partyIdToSave = party.id || `party_${Date.now()}`;
    const newOrUpdatedParty: EquityParty = {
      id: partyIdToSave,
      projectId,
      role: party.role as 'GP' | 'LP' | 'co_buyer',
      name: party.name,
      email: party.email || null,
      entityType: (party.entityType || 'Individual') as 'Individual' | 'LLC' | 'Other',
      memberId: party.memberId || null,
      ownershipPct: party.ownershipPct ?? 0,
      phasePermissions: party.phasePermissions || {
        'phase-1': { canView: true, canEdit: false },
        'phase-2': { canView: true, canEdit: false },
        'phase-3': { canView: false, canEdit: false },
        'phase-4': { canView: false, canEdit: false },
      }
    };

    const existingIndex = equityParties.findIndex(p => p.id === partyIdToSave);
    if (existingIndex > -1) {
      equityParties[existingIndex] = newOrUpdatedParty;
    } else {
      equityParties.push(newOrUpdatedParty);
    }

    // If GP co-investment is updated, sync it to the project's financials.capitalStack
    if (newOrUpdatedParty.role === 'GP' && gpCoInvestAmount !== undefined) {
      const financials = projectData.financials || {};
      const capitalStack: CapitalSource[] = financials.capitalStack || [];
      const gpSourceIndex = capitalStack.findIndex(s => s.category === 'GP Co-investment');

      const updatedGpSource: CapitalSource = {
        id: gpSourceIndex > -1 ? capitalStack[gpSourceIndex].id : `source_gp_${Date.now()}`,
        category: 'GP Co-investment',
        amount: gpCoInvestAmount,
        interestRate: 0,
        status: 'Funded',
        lenderName: 'GP Co-investment',
        type: 'syndication_equity',
      };

      if (gpSourceIndex > -1) {
        capitalStack[gpSourceIndex] = updatedGpSource;
      } else {
        capitalStack.push(updatedGpSource);
      }

      financials.capitalStack = capitalStack;
      await projectRef.update({ financials });
    }

  } else if (action === 'delete') {
    if (!partyId) {
      return NextResponse.json({ success: false, error: 'partyId is required' }, { status: 400 });
    }
    // If we delete a GP, remove GP Co-investment from capital stack as well
    const partyToDelete = equityParties.find(p => p.id === partyId);
    if (partyToDelete?.role === 'GP') {
      const financials = projectData.financials || {};
      const capitalStack: CapitalSource[] = financials.capitalStack || [];
      const updatedStack = capitalStack.filter(s => s.category !== 'GP Co-investment');
      financials.capitalStack = updatedStack;
      await projectRef.update({ financials });
    }

    equityParties = equityParties.filter(p => p.id !== partyId);
  }

  // UpdatecompletedFundCards list if needed (e.g. F2.1 completion)
  let completedFundCards: string[] = projectData.completedFundCards || [];
  if (equityParties.length > 0 && !completedFundCards.includes('F2.1')) {
    completedFundCards = [...completedFundCards, 'F2.1'];
  } else if (equityParties.length === 0 && completedFundCards.includes('F2.1')) {
    completedFundCards = completedFundCards.filter(id => id !== 'F2.1');
  }

  await projectRef.update({ equityParties, completedFundCards });

  return NextResponse.json({ success: true, equityParties, completedFundCards });
}
