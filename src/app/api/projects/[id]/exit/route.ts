import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/exit

   Updates Phase 4 (Exit) data for a project. Handles two modes:

   1. **Exit Assumptions Update** — Updates projected sale price,
      hold period, selling costs, and exit strategy fields.

   2. **Realized State Transition** — When `realized: true` is sent,
      the project is hardened into an immutable realized state:
      - reiStatus → 'realized'
      - currentPhase → 4
      - closedAt → ISO timestamp
      - All financial fields marked as finalized

   Auth: Firebase ID Token (Bearer header)
   Body: { financials?: Partial<Financials>, realized?: boolean }
   ═══════════════════════════════════════════════════════════════ */

/** Zod schema for exit financial fields */
const exitFinancialsSchema = z.object({
  // Sale assumptions
  actualSalePrice: z.number().min(0).optional(),
  projectedSalePrice: z.number().min(0).optional(),
  estimatedCurrentValue: z.number().min(0).optional(),
  soldDate: z.string().optional(),
  listingDate: z.string().optional(),

  // Selling costs
  buyersAgentCommission: z.number().min(0).max(100).optional(),
  sellersAgentCommission: z.number().min(0).max(100).optional(),
  finalClosingCosts: z.number().min(0).optional(),
  finalClosingAttorneyFees: z.number().min(0).optional(),
  titleInsuranceSettlement: z.number().min(0).optional(),
  loanOriginationFeesSettlement: z.number().min(0).optional(),
  agentCommissionsFixed: z.number().min(0).optional(),
  sellerConcessionsFixed: z.number().min(0).optional(),

  // Marketing / disposition
  stagingCosts: z.number().min(0).optional(),
  photographyAndMedia: z.number().min(0).optional(),
  mlsListingFees: z.number().min(0).optional(),
  utilityUpkeep: z.number().min(0).optional(),
  landscapingMaintenance: z.number().min(0).optional(),
  marketingBudget: z.number().min(0).optional(),
  ongoingLeasingFees: z.number().min(0).optional(),

  // Hold period / strategy
  projectedHoldTimeMonths: z.number().min(0).optional(),
  annualAppreciationPercent: z.number().optional(),
  exitStrategyType: z.enum(['Sell', 'Rent', 'Lease']).optional(),

  // Tax
  marginalTaxBracket: z.number().min(0).max(100).optional(),
}).passthrough();

const exitBodySchema = z.object({
  financials: exitFinancialsSchema.optional(),
  realized: z.boolean().optional(),
  status: z.string().optional(),
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
    const validationResult = exitBodySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { financials, realized, ...topLevelUpdates } = validationResult.data;

    // 3. Verify user has write access to this project
    const dealRef = adminDb.collection('projects').doc(projectId);
    const dealSnap = await dealRef.get();

    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = dealSnap.data();
    const targetOrgId = projectData?.organizationId;

    // Check if project is locked (immutable)
    if (projectData?.locked) {
      return NextResponse.json(
        { error: 'Project is archived and locked. No modifications allowed.' },
        { status: 409 }
      );
    }

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

    // 4. Build the update payload
    const existingFinancials = projectData?.financials || {};

    if (topLevelUpdates.status) {
      const val = topLevelUpdates.status as string;
      if (!['acquisition', 'fund', 'hold', 'exit'].includes(val)) {
        return NextResponse.json(
          { error: `Invalid status: '${val}'. Status must be a canonical lowercase key: 'acquisition', 'fund', 'hold', or 'exit'.` },
          { status: 400 }
        );
      }
    }

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

    // 5. Handle the realized state transition
    if (realized === true) {
      const now = new Date().toISOString();

      // Harden the project into realized state
      updatePayload.reiStatus = 'realized';
      updatePayload.currentPhase = 4;
      updatePayload.closedAt = now;
      updatePayload.phaseStatus = 'Phase 4: Realized';

      // Merge realized financial flags
      const mergedFinancials = (updatePayload.financials as Record<string, unknown>) || {
        ...existingFinancials,
      };

      // Set soldDate if not already provided
      if (!mergedFinancials.soldDate) {
        mergedFinancials.soldDate = now;
      }

      // Ensure actualSalePrice is set (copy from projectedSalePrice if needed)
      if (!mergedFinancials.actualSalePrice && mergedFinancials.projectedSalePrice) {
        mergedFinancials.actualSalePrice = mergedFinancials.projectedSalePrice;
      } else if (!mergedFinancials.actualSalePrice && existingFinancials.projectedSalePrice) {
        mergedFinancials.actualSalePrice = existingFinancials.projectedSalePrice;
      }

      // Mark financials as realized
      mergedFinancials.exitRealized = true;
      mergedFinancials.realizedAt = now;

      updatePayload.financials = mergedFinancials;
    }

    // 6. Update Firestore with tracking
    const { updateProjectWithTracking } = await import('@/lib/firebase/projectWriteWrapper');
    await updateProjectWithTracking(projectId, uid, updatePayload, 'manual');

    // 7. Return updated project snapshot
    const updatedSnap = await dealRef.get();
    const updatedProject = { id: updatedSnap.id, ...updatedSnap.data() };

    return NextResponse.json({
      success: true,
      realized: realized === true,
      project: updatedProject,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Exit PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update exit data', details: errMsg },
      { status: 500 }
    );
  }
}
