import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { holdRegistryUpdateSchema } from '@/lib/schemas/hold-registry-schema';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/hold/registry

   Updates Hold-phase registry fields using the canonical
   Hold registry schema (HD-3).

   This route validates ALL writes against the canonical schema:
   - 8 expense categories only (SKILL.md Rule 8)
   - 5 renovation tiers only (SKILL.md Rule 3)
   - Source-tagged values (SKILL.md Rule 7)
   - Strict mode rejects non-canonical fields

   Auth: Firebase ID Token (Bearer header)
   Body: Partial<HoldRegistry> per hold-registry-schema.ts
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

    // 2. Parse and validate body against canonical Hold registry schema
    const body = await request.json();
    const validationResult = holdRegistryUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Hold registry validation failed — canonical schema enforced',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

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

    // 4. Build the canonical registry update
    //    Nest under `holdRegistry` to separate from legacy fields.
    //    This is a merge-write — only supplied fields are updated.
    const existingRegistry = projectData?.holdRegistry || {};
    const updatePayload: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Merge each registry section — arrays replace, scalars overwrite
    const mergedRegistry = { ...existingRegistry };

    // Scalar fields — direct overwrite
    if (validated.renovationTier !== undefined)
      mergedRegistry.renovationTier = validated.renovationTier;
    if (validated.rehabBudget !== undefined)
      mergedRegistry.rehabBudget = validated.rehabBudget;
    if (validated.rehabCompletionTarget !== undefined)
      mergedRegistry.rehabCompletionTarget = validated.rehabCompletionTarget;
    if (validated.rehabCompletedDate !== undefined)
      mergedRegistry.rehabCompletedDate = validated.rehabCompletedDate;
    if (validated.targetRent !== undefined)
      mergedRegistry.targetRent = validated.targetRent;
    if (validated.targetLeaseTerms !== undefined)
      mergedRegistry.targetLeaseTerms = validated.targetLeaseTerms;
    if (validated.listPriceSale !== undefined)
      mergedRegistry.listPriceSale = validated.listPriceSale;
    if (validated.occupancyDuringHold !== undefined)
      mergedRegistry.occupancyDuringHold = validated.occupancyDuringHold;
    if (validated.utilitiesResponsibility !== undefined)
      mergedRegistry.utilitiesResponsibility = validated.utilitiesResponsibility;
    if (validated.reservePolicies !== undefined)
      mergedRegistry.reservePolicies = validated.reservePolicies;

    // Array fields — full replace (UI sends complete array)
    if (validated.rehabSpend !== undefined)
      mergedRegistry.rehabSpend = validated.rehabSpend;
    if (validated.currentValueSeries !== undefined)
      mergedRegistry.currentValueSeries = validated.currentValueSeries;
    if (validated.listingAdLog !== undefined)
      mergedRegistry.listingAdLog = validated.listingAdLog;
    if (validated.showingsLog !== undefined)
      mergedRegistry.showingsLog = validated.showingsLog;
    if (validated.screeningChecklist !== undefined)
      mergedRegistry.screeningChecklist = validated.screeningChecklist;
    if (validated.reserveFundingStatus !== undefined)
      mergedRegistry.reserveFundingStatus = validated.reserveFundingStatus;

    // Holding costs — merge by category key (never lose categories the user hasn't updated)
    if (validated.holdingCosts !== undefined) {
      mergedRegistry.holdingCosts = {
        ...(existingRegistry.holdingCosts || {}),
        ...validated.holdingCosts,
      };
    }

    // Derive rehabSpendTotal from spend entries
    if (mergedRegistry.rehabSpend?.length) {
      mergedRegistry.rehabSpendTotal = mergedRegistry.rehabSpend.reduce(
        (sum: number, entry: { amount: number }) => sum + entry.amount,
        0
      );
    }

    updatePayload.holdRegistry = mergedRegistry;

    // 5. Update Firestore
    await dealRef.update(updatePayload);

    // 6. Return updated registry
    const updatedSnap = await dealRef.get();
    const updatedRegistry = updatedSnap.data()?.holdRegistry || {};

    return NextResponse.json({
      success: true,
      holdRegistry: updatedRegistry,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Hold Registry PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update Hold registry', details: errMsg },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/projects/[id]/hold/registry

   Returns the canonical Hold registry for a project.
   ═══════════════════════════════════════════════════════════════ */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const dealRef = adminDb.collection('projects').doc(projectId);
    const dealSnap = await dealRef.get();

    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = dealSnap.data();
    const targetOrgId = projectData?.organizationId;

    // Check read access
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;

    let hasAccess = false;
    if (targetOrgId && profile) {
      if (profile.personalOrganizationId === targetOrgId) hasAccess = true;
      else if (profile.organizationId === targetOrgId) hasAccess = true;
      else if (profile.memberships?.[targetOrgId]) hasAccess = true;
    }
    if (projectData?.members?.[uid]) hasAccess = true;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      holdRegistry: projectData?.holdRegistry || null,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Hold Registry GET] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to fetch Hold registry', details: errMsg },
      { status: 500 }
    );
  }
}
