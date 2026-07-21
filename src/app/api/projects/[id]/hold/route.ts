import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/hold

   Updates Phase 3 (Hold) operational data for a project.
   Validates operations fields (rent, vacancy, expenses, rehab lines)
   then merges into Firestore.

   Auth: Firebase ID Token (Bearer header)
   Body: { financials?: Partial<Financials>, rehab?: ..., holdingCosts?: ..., rehabExpenses?: ... }
   ═══════════════════════════════════════════════════════════════ */

/** Zod schema for hold/operations financial fields */
const holdFinancialsSchema = z.object({
  // Rent roll
  monthlyGrossRent: z.number().min(0).optional(),
  projectedMonthlyRent: z.number().min(0).optional(),
  numberOfUnits: z.number().int().min(1).optional(),
  occupiedUnits: z.number().int().min(0).optional(),
  otherMonthlyIncome: z.number().min(0).optional(),

  // Vacancy
  vacancyRatePercent: z.number().min(0).max(100).optional(),

  // Operating expenses (6 standard categories)
  holdingCostTaxes: z.number().min(0).optional(),
  holdingCostInsurance: z.number().min(0).optional(),
  holdingCostUtilities: z.number().min(0).optional(),
  propertyManagementFeePercent: z.number().min(0).max(100).optional(),
  propertyManagementFee: z.number().min(0).optional(),
  monthlyMaintenanceReserve: z.number().min(0).optional(),
  monthlyHOA: z.number().min(0).optional(),

  // Custom expense lines
  customExpenses: z.array(z.object({
    label: z.string().min(1),
    amount: z.number().min(0),
  })).optional(),

  // Exit strategy
  exitStrategyType: z.enum(['Sell', 'Rent', 'Lease']).optional(),

  // Rehab tier
  rehabTier: z.string().optional(),
  rehabTierBudgetLow: z.number().min(0).optional(),
  rehabTierBudgetHigh: z.number().min(0).optional(),
}).passthrough(); // Allow additional financials fields to pass through

const holdingCostEntrySchema = z.object({
  label: z.string(),
  monthlyAmount: z.number().min(0),
  category: z.string().optional(),
}).passthrough();

const rehabExpenseSchema = z.object({
  description: z.string(),
  amount: z.number().min(0),
  paid: z.boolean().optional(),
}).passthrough();

const holdBodySchema = z.object({
  financials: holdFinancialsSchema.optional(),
  holdingCosts: z.array(holdingCostEntrySchema).optional(),
  rehabExpenses: z.array(rehabExpenseSchema).optional(),
  rehab: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

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
    const validationResult = holdBodySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { financials, holdingCosts, rehabExpenses, rehab, ...topLevelUpdates } = validationResult.data;

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

    // 4. Build the update payload — merge financials, rehab, and line items
    const existingFinancials = projectData?.financials || {};
    const existingRehab = projectData?.rehab || {};

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

    if (rehab) {
      updatePayload.rehab = {
        baseBudget: 0,
        contingencyBufferPercentage: 0.15,
        tasks: [],
        permits: [],
        pendingReceipts: [],
        drawRequests: [],
        ...existingRehab,
        ...rehab,
      };
    }

    if (holdingCosts !== undefined) {
      updatePayload.holdingCosts = holdingCosts;
    }

    if (rehabExpenses !== undefined) {
      updatePayload.rehabExpenses = rehabExpenses;
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
    console.error('[Hold PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update hold/operations data', details: errMsg },
      { status: 500 }
    );
  }
}
