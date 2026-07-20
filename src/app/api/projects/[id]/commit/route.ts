import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════════════
   POST /api/projects/[id]/commit — Commit a draft project to Active

   Transitions a project from draft status to its active lifecycle
   phase. Called by the wizard's final "Confirm & Create" step after
   all data has been saved.

   Validates that:
   1. The project exists and belongs to the authenticated user
   2. Required fields (propertyName, address, purchasePrice) are present
   3. The project is not already locked/closed

   Auth: Firebase ID Token (Bearer header)
   Returns: { success: true, projectId, status, currentPhase }
   ═══════════════════════════════════════════════════════════════ */

export async function POST(
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

    // 2. Fetch the project
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectSnap.data()!;

    // 3. Verify ownership
    if (project.ownerUid !== uid && !project.members?.[uid]) {
      return NextResponse.json(
        { error: 'Access denied. Only the project owner or members can commit.' },
        { status: 403 }
      );
    }

    // 4. Ensure the project is not already locked
    if (project.locked) {
      return NextResponse.json(
        { error: 'Project is already closed and locked.' },
        { status: 409 }
      );
    }

    // 5. Validate required fields before committing
    const errors: string[] = [];
    if (!project.propertyName?.trim()) errors.push('Property name is required');
    if (!project.address?.trim()) errors.push('Address is required');
    if (!project.financials?.purchasePrice || project.financials.purchasePrice <= 0) {
      errors.push('Purchase price must be greater than zero');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot commit: required fields are missing',
          details: errors,
        },
        { status: 422 }
      );
    }

    // 6. Commit — set the project to active status
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      committedAt: new Date(),
    };

    // If status is still 'Draft', transition to the correct active status
    if (project.status === 'Draft') {
      updates.status = project.phaseStatus?.includes('Phase 1') ? 'Acquisition' :
                       project.phaseStatus?.includes('Phase 2') ? 'Fund' :
                       project.phaseStatus?.includes('Phase 3') ? 'Hold' :
                       project.phaseStatus?.includes('Phase 4') ? 'Exit' : 'Acquisition';
    }

    await projectRef.update(updates);

    return NextResponse.json({
      success: true,
      projectId,
      status: updates.status || project.status,
      currentPhase: project.currentPhase,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects Commit] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to commit project', details: errMsg },
      { status: 500 }
    );
  }
}
