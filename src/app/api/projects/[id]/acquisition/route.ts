import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { projectFinancialsSchema } from '@/lib/schemas/projectSchema';
import { verifyProjectAccessAndRole, authorizeProjectMutation } from '@/lib/firebase-admin/project-guard';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/acquisition
   
   Updates Phase 1 (Acquisition) financial data for a project.
   Validates the payload against the Zod projectFinancialsSchema
   (partial mode), verifies write access, and merges into Firestore.
   
   Auth: Firebase ID Token (Bearer header)
   Body: Partial<ProjectFinancials>
   ═══════════════════════════════════════════════════════════════ */

export async function PATCH(
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
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 }
      );
    }

    // 2. Parse and validate body against projectFinancialsSchema (partial)
    const body = await request.json();
    const { financials, ...topLevelUpdates } = body;

    // Validate financials portion if provided
    if (financials) {
      const validationResult = projectFinancialsSchema.partial().safeParse(financials);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }
    }

    // 3. Verify user has write access to this project
    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token?.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const authCheck = authorizeProjectMutation(access, 'phase-1');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 403 });
    }

    const projectData = access.project;

    // 4. Build the update payload — merge financials with existing
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

    // 5. Update Firestore with merge
    const dealRef = adminDb.collection('projects').doc(projectId);
    await dealRef.update(updatePayload);

    // 6. Return updated project snapshot
    const updatedSnap = await dealRef.get();
    const updatedProject = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Acquisition PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update acquisition data', details: errMsg },
      { status: 500 }
    );
  }
}
