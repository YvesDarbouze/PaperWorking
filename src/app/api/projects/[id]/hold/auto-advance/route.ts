import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { NotificationService } from '@/lib/services/notificationService';
import { determineAccessAndRole, authorizeProjectMutation } from '@/lib/firebase-admin/project-guard';
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
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectData = projectSnap.data()!;
    const targetOrgId = projectData.organizationId;

    let orgData: any = null;
    if (targetOrgId) {
      const orgSnap = await adminDb.collection('organizations').doc(targetOrgId).get();
      if (orgSnap.exists) {
        orgData = orgSnap.data();
      }
    }

    const access = determineAccessAndRole(projectData, uid, auth.token?.email, orgData);
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const authCheck = authorizeProjectMutation(access, 'phase-3');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 403 });
    }

    const financials = projectData.financials || {};

    // Enforce Rule 14 event-triggered gating verification
    const tenantRegistry = financials.tenantRegistry || [];
    const hasActiveLease = Array.isArray(tenantRegistry) && tenantRegistry.some((t: any) => t.status === 'active');

    const incomeLedger = financials.incomeLedger || [];
    const hasRentPayment = Array.isArray(incomeLedger) && incomeLedger.some((i: any) => i.amount > 0);

    const hasSaleContract = financials.sale_under_contract === true;

    if (!hasActiveLease && !hasRentPayment && !hasSaleContract) {
      return NextResponse.json(
        { error: 'Gating violation: Hold to Exit transition requires a verified event (active lease, rent payment, or sale under contract).' },
        { status: 400 }
      );
    }

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;

    // 4. Update project to Phase 4 & write baseline
    const existingFinancials = projectData?.financials || {};
    const financialsUpdates = {
      ...existingFinancials,
      exit_cost_basis: costBasis,
      exit_capitalized_improvements: capitalizedImprovements,
      exit_holding_cost_total: holdingCosts,
      exit_marketing_outcome: outcome
    };

    const dealRef = adminDb.collection('projects').doc(projectId);
    await dealRef.update({
      phaseStatus: 'Phase 4: Exit',
      currentPhase: 4,
      status: 'exit',
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
