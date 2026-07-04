import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { projectFinancialsSchema } from '@/lib/schemas/projectSchema';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/purchase

   Updates Phase 2 (Purchase) financing data for a project.
   Validates the payload against the Zod projectFinancialsSchema
   (partial mode) scoped to financing fields, verifies write access,
   and merges into Firestore.

   Auth: Firebase ID Token (Bearer header)
   Body: { financials: { loanAmount, interestRate, loanTermYears, ... } }
   ═══════════════════════════════════════════════════════════════ */

/** Allowed Phase 2 financing fields — reject anything outside this set */
const ALLOWED_FINANCING_FIELDS = new Set([
  'loanAmount',
  'loanInterestRate',
  'loanTermYears',
  'financingType',
  'loanOriginationPoints',
  'closingCosts',
  'totalCashInvested',
  'loanProcessorName',
  'closingAttorneyName',
  'inspectionCost',
  'titleSearchCost',
  'insuranceCost',
  'hoaMonthly',
  'purchasePrice',
  'initialCapitalizedBasis',
]);

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

    // 2. Parse and validate body
    const body = await request.json();
    const { financials, ...topLevelUpdates } = body;

    // Validate financials portion if provided
    if (financials) {
      // Filter to only allowed Phase 2 financing fields
      const unknownFields = Object.keys(financials).filter(
        (k) => !ALLOWED_FINANCING_FIELDS.has(k)
      );
      if (unknownFields.length > 0) {
        return NextResponse.json(
          {
            error: 'Invalid fields for Phase 2 purchase update',
            invalidFields: unknownFields,
          },
          { status: 400 }
        );
      }

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
    const dealRef = adminDb.collection('projects').doc(projectId);
    const dealSnap = await dealRef.get();

    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = dealSnap.data();
    const targetOrgId = projectData?.organizationId;

    // Check org membership
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;

    let hasAccess = false;
    if (targetOrgId && profile) {
      if (profile.personalOrganizationId === targetOrgId) hasAccess = true;
      else if (profile.organizationId === targetOrgId) hasAccess = true;
      else if (profile.memberships?.[targetOrgId]) hasAccess = true;
    }

    // Also check project-level membership
    if (projectData?.members?.[uid]) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied. You do not have write access to this project.' },
        { status: 403 }
      );
    }

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
    console.error('[Purchase PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update purchase data', details: errMsg },
      { status: 500 }
    );
  }
}
