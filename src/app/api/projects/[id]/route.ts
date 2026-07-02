import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { clearDashboardCache } from '@/lib/cache/dashboardCache';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id] — Update project fields

   General-purpose project update route. Used by the wizard for
   draft auto-save and by other components for partial updates.

   Auth: Firebase ID Token (Bearer header)
   Body: Partial project fields to merge
   Returns: { success: true, project: updatedProject }
   ═══════════════════════════════════════════════════════════════ */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 }
      );
    }

    // 2. Parse the update body first
    const body = await request.json();
    const { financials, ...topLevelUpdates } = body;

    const projectRef = adminDb.collection('projects').doc(projectId);

    // 3. Verify access and update project within a transaction
    const transactionResult = await adminDb.runTransaction(async (transaction) => {
      const projectSnap = await transaction.get(projectRef);

      if (!projectSnap.exists) {
        return { status: 404, error: 'Project not found' };
      }

      const projectData = projectSnap.data();
      const targetOrgId = projectData?.organizationId;

      if (!targetOrgId) {
        return { status: 400, error: 'Project has no organization ID associated' };
      }

      // Check org membership securely against organization document
      const orgRef = adminDb.collection('organizations').doc(targetOrgId);
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists) {
        return { status: 404, error: 'Organization not found' };
      }

      const orgData = orgSnap.data();
      const isOwner = orgData?.ownerUid === uid;
      const teamMember = orgData?.teamMembers?.find((m: any) => m.id === uid && m.status === 'active');
      const isProjectMember = !!projectData?.members?.[uid];

      if (!isOwner && !teamMember && !isProjectMember) {
        return { status: 403, error: 'Access denied. You do not have write access to this project.' };
      }

      // Enforce scoped team member project restrictions
      if (teamMember && teamMember.isScoped) {
        const allowed = teamMember.scopedProjectIds ?? teamMember.assignedProjectIds ?? [];
        if (!allowed.includes(projectId)) {
          return { status: 403, error: 'Access denied. You do not have write access to this project.' };
        }
      }

      // Build update payload — deep merge financials
      const existingFinancials = projectData?.financials || {};
      const updatePayload: Record<string, unknown> = {
        ...topLevelUpdates,
        updatedAt: new Date(),
      };

      if (financials) {
        updatePayload.financials = {
          ...existingFinancials,
          ...financials,
        };
      }

      // Perform update inside transaction
      transaction.update(projectRef, updatePayload);

      // Clear dashboard cache inside transaction on success
      clearDashboardCache(targetOrgId);

      return {
        success: true,
        orgId: targetOrgId,
        projectName: projectData?.propertyName || projectData?.address || projectId,
        prevStatus: projectData?.status,
        nextStatus: topLevelUpdates.status,
        prevPhase: projectData?.phaseStatus,
        nextPhase: topLevelUpdates.phaseStatus,
      };
    });

    if ('error' in transactionResult) {
      return NextResponse.json(
        { error: transactionResult.error },
        { status: transactionResult.status }
      );
    }

    // Emit phase_change activity when status or phaseStatus actually changed
    const { orgId, projectName, prevStatus, nextStatus, prevPhase, nextPhase } = transactionResult;
    const statusChanged = nextStatus && nextStatus !== prevStatus;
    const phaseChanged = nextPhase && nextPhase !== prevPhase;
    if (orgId && (statusChanged || phaseChanged)) {
      const actorName = auth.token.name || auth.token.email || 'Unknown';
      const changeLabel = phaseChanged
        ? `moved to ${nextPhase}`
        : `status changed to "${nextStatus}"`;
      logOrgActivity({
        organizationId: orgId,
        type: 'phase_change',
        actorId: uid,
        actorName,
        summary: `${projectName} — ${changeLabel}`,
        targetRef: `projects/${projectId}`,
        projectId,
        projectName,
      });
    }

    // 4. Return updated snapshot after successful transaction
    const updatedSnap = await projectRef.get();
    const updatedProject = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update project', details: errMsg },
      { status: 500 }
    );
  }
}
