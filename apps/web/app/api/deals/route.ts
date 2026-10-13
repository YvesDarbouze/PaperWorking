import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import { buildDealsReadService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  getProjectFromStore,
  updateProjectInStore,
} from '@/lib/projects/project-store';
import {
  createDealInStore,
  patchDealInStore,
} from '@/lib/deals/deal-store';
import { sanitizeDealImageUrl } from '@/lib/properties/property-image-helper';
import { secureRandomHex } from '@/lib/utils/secure-id';
import { normalizeToStructuredError } from '@paperworking/shared';

const CreateDealSchema = z.object({
  projectId: z.string().optional().nullable(),
  name: z.string().optional(),
  title: z.string().optional(),
  propertyName: z.string().optional(),
  address: z.string().min(1, 'Property address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  rehabCost: z.number().nonnegative().optional().default(0),
  arv: z.number().positive().optional().nullable(),
  holdingCosts: z.number().nonnegative().optional().default(0),
  projectedRoi: z.number().optional().default(15.0),
  targetIrr: z.number().optional(),
  equityMultiple: z.number().optional().default(1.75),
  holdPeriod: z.string().optional().default('3–5 Years'),
  minInvestment: z.number().positive().optional().default(25000),
  fundingTarget: z.number().positive().optional(),
  slug: z.string().optional(),
  dealType: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['crowdfunding', 'syndication']).optional().default('syndication'),
  ),
  strategy: z.string().optional().default('VALUE_ADD'),
  disposition: z.string().optional(),
  assetClass: z.string().optional().default('Multifamily'),
  pitch: z.string().optional(),
  visibility: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['marketplace', 'invitation_only', 'private']).optional().default('marketplace'),
  ),
  status: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().optional().default('published'),
  ),
  imageUrl: z.string().optional(),
  calculatorResults: z
    .object({
      purchasePrice: z.number().optional(),
      rehabBudget: z.number().optional(),
      arv: z.number().optional(),
      targetIrr: z.number().optional(),
      projectedRoi: z.number().optional(),
      cashRequired: z.number().optional(),
      equityMultiple: z.number().optional(),
      capRateOnCost: z.number().optional(),
      cashOnCashReturnPct: z.number().optional(),
      monthlyDebtService: z.number().optional(),
      grossMonthlyRent: z.number().optional(),
      netOperatingIncome: z.number().optional(),
      maximumAllowableOffer70Pct: z.number().optional(),
      strategy: z.string().optional(),
      holdPeriod: z.string().optional(),
    })
    .optional(),
});

const PatchDealSchema = z.object({
  dealId: z.string().optional(),
  id: z.string().optional(),
  slug: z.string().optional(),
  visibility: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.enum(['marketplace', 'invitation_only', 'private']).optional(),
  ),
  status: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().optional(),
  ),
  imageUrl: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? url.searchParams.get('search') ?? undefined;
  const tab = url.searchParams.get('tab') ?? undefined;

  try {
    const result = await buildDealsReadService().listDeals(user, { q, tab });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse(auth);
  }

  if (auth.accountType === 'vendor') {
    const errMsg =
      'Vendors cannot post on the Deals Marketplace. Deal posting is reserved for Investors and Investment Teams.';
    return NextResponse.json(
      {
        ...normalizeToStructuredError(errMsg, 403),
        error: errMsg,
      },
      { status: 403 },
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = CreateDealSchema.parse(rawBody);

    const dealId = `deal-mp-${Date.now()}`;
    const slugBase = (parsed.name || parsed.propertyName || parsed.address)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug =
      parsed.slug?.trim() || `${slugBase || 'deal'}-${Date.now().toString().slice(-4)}`;

    const targetIrr = parsed.targetIrr ?? parsed.projectedRoi ?? 15.0;
    const fundingTarget =
      parsed.fundingTarget ??
      Math.round(parsed.purchasePrice * 0.3 + (parsed.rehabCost || 0));

    let projectsRef: Array<Record<string, unknown>> = [];
    if (parsed.projectId) {
      const parentProject = await getProjectFromStore(parsed.projectId);
      if (parentProject) {
        await updateProjectInStore(parsed.projectId, {
          dealId,
          dealSlug: slug,
          dealAddress: parsed.address,
        });

        projectsRef = [
          {
            id: parentProject.id,
            name: parentProject.propertyName || (parentProject as any).name || parsed.name,
            city: parentProject.city,
            state: (parentProject as any).state,
            zip: (parentProject as any).zip,
            propertyType: (parentProject as any).propertyType || parsed.assetClass,
            subStrategy: (parentProject as any).subStrategy || parsed.strategy,
          },
        ];
      }
    }

    const shareToken =
      parsed.visibility === 'private' || parsed.visibility === 'invitation_only'
        ? `token_${slug}_${secureRandomHex(16)}`
        : undefined;

    const newDeal = {
      id: dealId,
      slug,
      address: parsed.address,
      status: parsed.status || 'published',
      visibility: parsed.visibility || 'marketplace',
      shareToken,
      sharedWith: [auth.uid],
      purchasePrice: parsed.purchasePrice,
      rehabCost: parsed.rehabCost,
      arv: parsed.arv ?? null,
      holdingCosts: parsed.holdingCosts,
      projectedRoi: targetIrr,
      targetIrr,
      equityMultiple: parsed.equityMultiple,
      holdPeriod: parsed.holdPeriod,
      minInvestment: parsed.minInvestment,
      fundingTarget,
      target: fundingTarget,
      committedAmount: 0,
      committed: 0,
      dealType: parsed.dealType,
      imageUrl: sanitizeDealImageUrl(
        parsed.imageUrl,
        parsed.assetClass,
        parsed.strategy,
      ),
      isVerifiedOperator: true,
      creatorId: auth.uid,
      creator: { name: 'PaperWorking Capital Partner' },
      createdAt: new Date().toISOString(),
      projectId: parsed.projectId || null,
      projects: projectsRef,
      commitments: [],
      invitations: [],
      pitch: parsed.pitch || `Investment opportunity underwritten via PaperWorking. Target IRR of ${targetIrr}%.`,
      subStrategy: parsed.strategy,
      assetClass: parsed.assetClass,
      propertyName: parsed.name || parsed.propertyName || parsed.address,
      name: parsed.name || parsed.address,
      calculatorResults: parsed.calculatorResults || {
        purchasePrice: parsed.purchasePrice,
        rehabBudget: parsed.rehabCost || 0,
        arv: parsed.arv ?? Math.round(parsed.purchasePrice * 1.25),
        targetIrr,
        projectedRoi: targetIrr,
        cashRequired: fundingTarget,
        equityMultiple: parsed.equityMultiple || 1.75,
        capRateOnCost: 6.0,
        cashOnCashReturnPct: 5.0,
        monthlyDebtService: Math.round(((parsed.purchasePrice * 0.75) * 0.07) / 12),
        grossMonthlyRent: Math.round(parsed.purchasePrice * 0.008),
        netOperatingIncome: Math.round(parsed.purchasePrice * 0.008 * 12 * 0.65),
        maximumAllowableOffer70Pct: Math.round((parsed.arv ?? parsed.purchasePrice) * 0.7 - (parsed.rehabCost || 0)),
        strategy: parsed.strategy || 'VALUE_ADD',
        holdPeriod: parsed.holdPeriod || '3–5 Years',
      },
    };

    const created = await createDealInStore(newDeal as any);

    return NextResponse.json(
      {
        success: true,
        deal: created,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid deal payload' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deal' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse(auth);
  }

  try {
    const rawBody = await request.json();
    const parsed = PatchDealSchema.parse(rawBody);
    const targetIdentifier = parsed.dealId || parsed.id || parsed.slug;

    if (!targetIdentifier) {
      return NextResponse.json(
        { error: 'dealId, id, or slug is required for updating deal' },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (parsed.visibility) {
      patch.visibility = parsed.visibility;
    }
    if (parsed.status) {
      patch.status = parsed.status;
    }
    if (parsed.imageUrl !== undefined) {
      patch.imageUrl = sanitizeDealImageUrl(parsed.imageUrl);
    }

    const updated = await patchDealInStore(targetIdentifier, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deal: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid request payload' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update deal' },
      { status: 500 },
    );
  }
}
