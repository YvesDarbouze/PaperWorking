import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { canCreateProject } from '@/lib/entitlements/server';
import { clearDashboardCache } from '@/lib/cache/dashboardCache';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';
import { resolveOrCreateProperty } from '@/lib/services/propertyService';
import { canonicalizeAddress, generateDealSlug } from '@/lib/identity/propertyIdentity';
import type { AddressComponents } from '@/types/propertyTypes';

/* ═══════════════════════════════════════════════════════════════
   POST /api/projects — Create a new project (Draft or Active)
   
   Server-side validation layer for the ProjectCreationWizard.
   Accepts the structured payload from the wizard's handleFinalSubmit,
   validates via Zod, verifies org membership, and writes to Firestore
   using the Admin SDK.

   Auth: Firebase ID Token (Bearer header)
   Body: WizardSubmitPayload
   Returns: { success: true, projectId: string }
   ═══════════════════════════════════════════════════════════════ */

// ── Zod Validation Schema for Wizard Submission ──

const wizardFinancialsSchema = z.object({
  purchasePrice: z.number().nonnegative(),
  estimatedARV: z.number().nonnegative().optional().default(0),
  costs: z.array(z.any()).optional().default([]),
  raisingOutsideCapital: z.boolean().optional(),
  isBackdated: z.boolean().optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  entryPath: z.enum(['new_acquisition', 'already_owned', 'backdated']).optional(),
  acquisitionDate: z.any().optional(),
  estimatedCloseDate: z.any().optional(),
  soldDate: z.any().optional(),
  actualSalePrice: z.number().nonnegative().optional(),
  loanAmount: z.number().nonnegative().optional(),
  loanInterestRate: z.number().nonnegative().optional(),
  loanTermYears: z.number().positive().optional(),
  rehabActual: z.number().nonnegative().optional(),
  capitalRaiseTarget: z.number().nonnegative().optional(),
  annualDebtService: z.any().refine(val => val === undefined, {
    message: "annualDebtService is read-only and cannot be updated"
  }).optional(),
  equitySplit: z.number().optional(),
  requiredContingencies: z.array(z.string()).optional(),
  purchaseContractDoc: z.string().optional(),
  monthlyGrossRent: z.number().nonnegative().optional(),
  otherMonthlyIncome: z.number().nonnegative().optional(),
  vacancyRatePercent: z.number().optional(),
  holdingCostTaxes: z.number().nonnegative().optional(),
  operatingExpenseTaxes: z.number().nonnegative().optional(),
  holdingCostInsurance: z.number().nonnegative().optional(),
  operatingExpenseInsurance: z.number().nonnegative().optional(),
  holdingCostUtilities: z.number().nonnegative().optional(),
  propertyManagementFeePercent: z.number().optional(),
  monthlyMaintenanceReserve: z.number().nonnegative().optional(),
  maintenanceReserves: z.number().nonnegative().optional(),
  monthlyHOA: z.number().nonnegative().optional(),
  targetPrice: z.number().nonnegative().optional(),
  projectedRent: z.number().nonnegative().optional(),
  projectedSalePrice: z.number().nonnegative().optional(),
  projectedOpex: z.number().nonnegative().optional(),
  investorInvites: z.array(z.string()).optional(),
  marketplaceListing: z.boolean().optional(),
  offerStatus: z.string().optional(),
  offerAmount: z.number().nonnegative().optional(),
  offerDate: z.any().optional(),
}).passthrough(); // Allow additional fields we haven't explicitly listed

const wizardSubmitSchema = z.object({
  propertyName: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  street: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  reiStatus: z.string().optional(),
  status: z.string().optional().default('Lead'),
  dispositionType: z.string().optional(),
  subStrategy: z.string().optional(),
  assetClass: z.string().optional(),
  leadEmail: z.string().optional(),
  partnerEmails: z.string().optional(),
  vision: z.string().optional(),
  financingIntent: z.string().optional(),
  mlsListingKey: z.string().nullable().optional(),
  mlsListingId: z.string().nullable().optional(),
  mlsListPrice: z.number().nullable().optional(),
  mlsBeds: z.number().nullable().optional(),
  mlsBaths: z.number().nullable().optional(),
  mlsSqft: z.number().nullable().optional(),
  mlsThumbnailUrl: z.string().nullable().optional(),
  mlsStandardStatus: z.string().nullable().optional(),
  placeId: z.string().nullable().optional(),
  financials: wizardFinancialsSchema,
  organizationId: z.string().min(1, 'Organization ID is required'),
}).passthrough();

// ── REI Status → Phase Mapping (mirrors deals.ts) ──

function derivePhaseFromREIStatus(reiStatus?: string) {
  switch (reiStatus) {
    case 'Target':
      return { phaseStatus: 'Phase 1: Acquisition', currentPhase: 1, status: 'acquisition' };
    case 'In Contract':
    case 'Acquired':
      return { phaseStatus: 'Phase 2: Fund', currentPhase: 2, status: 'fund' };
    case 'Rehabbing':
    case 'Under Construction':
    case 'Renting':
      return { phaseStatus: 'Phase 3: Hold', currentPhase: 3, status: 'hold' };
    case 'For Sale':
    case 'realized':
    case 'Sold':
      return { phaseStatus: 'Phase 4: Exit', currentPhase: 4, status: 'exit' };
    default:
      return { phaseStatus: 'Phase 1: Acquisition', currentPhase: 1, status: 'acquisition' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 2. Parse & validate body
    const body = await request.json();
    const validation = wizardSubmitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const organizationId = data.organizationId;

    // 3. Verify org membership — auto-create personal org if missing
    const orgSnap = await adminDb.collection('organizations').doc(organizationId).get();
    if (!orgSnap.exists) {
      // Check if this is the user's personal org that was never bootstrapped
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const userData = userSnap.data();
      const isPersonalOrg = userData?.personalOrganizationId === organizationId;

      if (isPersonalOrg) {
        // Auto-create the missing personal org document
        await adminDb.collection('organizations').doc(organizationId).set({
          ownerUid: uid,
          name: `${userData?.displayName || 'User'}'s Workspace`,
          type: 'personal',
          subscriptionPlan: userData?.subscriptionPlan || 'None',
          subscriptionStatus: userData?.subscriptionStatus || 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
    } else {
      // Org exists — verify membership
      const orgData = orgSnap.data();
      const isOwner = orgData?.ownerUid === uid;
      const isTeamMember = orgData?.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');

      if (!isOwner && !isTeamMember) {
        return NextResponse.json(
          { error: 'Access denied. You are not an active member of this organization.' },
          { status: 403 }
        );
      }
    }

    // 4. Entitlement check: project count limit
    const entitlementCheck = await canCreateProject(uid);
    if (!entitlementCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Project limit reached',
          reason: entitlementCheck.reason,
          limit: entitlementCheck.limit,
          current: entitlementCheck.current,
          planId: entitlementCheck.planId,
          upgradeTo: entitlementCheck.upgradeTo,
        },
        { status: 402 }
      );
    }

    // 5. Derive lifecycle phase from REI status
    const { phaseStatus, currentPhase, status } = derivePhaseFromREIStatus(data.reiStatus);
    const hasSoldDate = !!data.financials?.soldDate;
    const finalPhaseStatus = hasSoldDate ? 'Phase 4: Closing & Exit' : phaseStatus;
    const finalPhase = hasSoldDate ? 4 : currentPhase;
    const finalStatus = hasSoldDate ? 'Sold' : (data.status || status);

    // 5a. DM-2: Resolve or create Property record if placeId available
    let propertyId: string | undefined;
    let placeId: string | undefined;
    let dealSlug: string | undefined;

    if (data.placeId) {
      try {
        const addressComponents: AddressComponents = {
          streetNumber: (data.street || '').split(' ')[0] || '',
          route: (data.street || '').split(' ').slice(1).join(' ') || '',
          city: data.city || '',
          state: (data.state || '').toUpperCase().slice(0, 2),
          zip: data.zip || '',
        };

        const { property } = await resolveOrCreateProperty({
          placeId: data.placeId,
          addressComponents,
          coordinates: {
            lat: data.lat ?? 0,
            lng: data.lng ?? 0,
          },
        });

        propertyId = property.id;
        placeId = property.placeId;

        // Generate dealSlug — fetch existing slugs for collision check
        const existingSlugsSnap = await adminDb
          .collection('projects')
          .where('organizationId', '==', organizationId)
          .select('dealSlug')
          .get();
        const existingSlugs = existingSlugsSnap.docs
          .map(d => d.data().dealSlug)
          .filter(Boolean) as string[];

        dealSlug = generateDealSlug(property.canonicalAddress, existingSlugs);
      } catch (propErr) {
        // Property resolution failure is non-blocking — project still creates
        console.error('[Projects] Property resolution failed (non-blocking):', propErr);
      }
    }

    // 6. Build Firestore document
    const projectRef = adminDb.collection('projects').doc();
    const now = new Date();

    const projectDoc = {
      ...data,
      id: projectRef.id,
      organizationId,
      phaseStatus: finalPhaseStatus,
      currentPhase: finalPhase,
      status: finalStatus,
      ownerUid: uid,
      ...(propertyId && { propertyId }),
      ...(placeId && { placeId }),
      ...(dealSlug && { dealSlug }),
      members: {
        [uid]: {
          role: 'Lead Investor',
          addedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    // Remove organizationId from top level since it's already set
    // (avoid duplication from the spread)

    // 6. Write to Firestore
    await projectRef.set(projectDoc);

    // 7. Clear dashboard cache
    clearDashboardCache(organizationId);

    // 8. Emit activity event — failure-isolated, never blocks the response
    const actorName = auth.token.name || auth.token.email || 'Unknown';
    logOrgActivity({
      organizationId,
      type: 'deal_created',
      actorId: uid,
      actorName,
      summary: `Added "${data.propertyName || data.address || 'new project'}" to the portfolio`,
      targetRef: `projects/${projectRef.id}`,
      projectId: projectRef.id,
      projectName: data.propertyName || data.address,
    });

    return NextResponse.json(
      {
        success: true,
        projectId: projectRef.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects POST] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to create project', details: errMsg },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    const userData = userSnap.data();
    const organizationId = userData?.organizationId;

    if (!organizationId) {
      return NextResponse.json({ success: true, projects: [] });
    }

    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get('q') || '';

    let projectsQuery = adminDb
      .collection('projects')
      .where('organizationId', '==', organizationId);

    const snapshot = await projectsQuery.get();
    let projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (queryParam) {
      const q = queryParam.toLowerCase();
      projects = projects.filter((p: any) => 
        (p.propertyName && p.propertyName.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ success: true, projects });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects GET] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: errMsg },
      { status: 500 }
    );
  }
}
