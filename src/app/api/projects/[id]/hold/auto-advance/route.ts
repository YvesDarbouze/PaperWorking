import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { NotificationService } from '@/lib/services/notificationService';
import { z } from 'zod';

const advanceBodySchema = z.object({
  costBasis: z.number(),
  capitalizedImprovements: z.number(),
  holdingCosts: z.number(),
  outcome: z.string()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify auth
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validationResult = advanceBodySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { costBasis, capitalizedImprovements, holdingCosts, outcome } = validationResult.data;

    // 3. Verify access
    const dealRef = adminDb.collection('projects').doc(projectId);
    const dealSnap = await dealRef.get();
    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = dealSnap.data();
    const targetOrgId = projectData?.organizationId;

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;

    let hasAccess = false;
    if (targetOrgId && profile) {
      if (profile.personalOrganizationId === targetOrgId) hasAccess = true;
      else if (profile.organizationId === targetOrgId) hasAccess = true;
      else if (profile.memberships?.[targetOrgId]) hasAccess = true;
    }
    if (projectData?.members?.[uid]) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Update project to Phase 4 & write baseline
    const existingFinancials = projectData?.financials || {};
    const financialsUpdates = {
      ...existingFinancials,
      exit_cost_basis: costBasis,
      exit_capitalized_improvements: capitalizedImprovements,
      exit_holding_cost_total: holdingCosts,
      exit_marketing_outcome: outcome
    };

    await dealRef.update({
      phaseStatus: 'Phase 4: Exit',
      currentPhase: 4,
      status: 'Exit',
      financials: financialsUpdates,
      updatedAt: new Date()
    });

    // 5. Send Notification to Lead Investor (ownerUid or current user)
    const recipient = projectData?.ownerUid || uid;
    const actorName = profile?.displayName || profile?.email || 'Lead Investor';
    const dealAddress = projectData?.propertyName || projectData?.address?.street || 'the project';

    try {
      await NotificationService.createNotification({
        recipientId: recipient,
        type: 'PHASE_TRANSITION',
        actor: { uid, name: actorName },
        objectReference: {
          projectId,
          dealAddress,
          phase: 'Exit'
        },
        deepLinkUrl: `/dashboard/projects/${projectId}/phase-4`
      });
    } catch (notifErr: any) {
      console.error('[AutoAdvance Notification] Failed to trigger notification:', notifErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Hold AutoAdvance POST] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to auto-advance hold phase', details: errMsg },
      { status: 500 }
    );
  }
}
