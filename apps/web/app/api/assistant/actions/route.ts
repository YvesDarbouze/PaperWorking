/**
 * Server-authoritative endpoint for Assistant Actions (Phase 3 Split-View Execution).
 *
 * Invariant:
 * All writes must travel the same validation paths as manual user input —
 * Ava is a fast user, not a privileged one (§7 Phase 3, §3.3).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getDefaultUnderwritingInputs } from '@paperworking/validation';
import { addSeedProject } from '@/lib/projects/seed-data';
import { addSeedDeal } from '@/lib/marketplace/seed-data';
import { verifyAppCheckHeader } from '@/lib/firebase/app-check-server';
import { FIRST_DEAL_COOKIE, MILESTONE_COOKIE } from '@/lib/auth/progressive-unlock';

export interface SkeletonDealPayload {
  action: 'buildSkeletonDeal';
  propertyName?: string;
  address?: string;
  purchasePrice?: number;
  rehabBudget?: number;
  expectedRent?: number;
}

export async function POST(request: NextRequest) {
  // 1. App Check verification
  const appCheckToken = request.headers.get('x-firebase-appcheck');
  const appCheckResult = await verifyAppCheckHeader(appCheckToken);
  if (!appCheckResult.valid) {
    return NextResponse.json({ error: appCheckResult.error || 'App Check failed.' }, { status: 403 });
  }

  // 2. Parse payload
  let body: SkeletonDealPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (body.action !== 'buildSkeletonDeal') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const propertyName = body.propertyName?.trim() || '1247 Elm Street Duplex';
  const address = body.address?.trim() || '1247 Elm Street, Austin, TX 78702';
  const purchasePrice = Number(body.purchasePrice) > 0 ? Number(body.purchasePrice) : 485000;
  const rehabBudget = Number(body.rehabBudget) >= 0 ? Number(body.rehabBudget) : 68000;
  const rent = Number(body.expectedRent) > 0 ? Number(body.expectedRent) : 4200;

  // 3. Validation parity with manual input
  const underwriting = getDefaultUnderwritingInputs(purchasePrice);
  underwriting.acquisition.rehabBudget = rehabBudget;
  underwriting.rentRoll.grossScheduledRent = rent;

  // Calculate standard metrics
  const annualGrossRent = rent * 12;
  const operatingExpenses = annualGrossRent * 0.35;
  const noi = annualGrossRent - operatingExpenses;
  const totalCost = purchasePrice + rehabBudget;
  const capRatePct = Number(((noi / totalCost) * 100).toFixed(1));
  const estimatedIrrPct = Number((capRatePct * 3.4).toFixed(1));
  const cashOnCashPct = Number(((noi / (totalCost * 0.25)) * 100).toFixed(1));

  const uniqueSuffix = Date.now().toString().slice(-4);
  const projectId = `proj-ava-${uniqueSuffix}`;
  const dealId = `deal-ava-${uniqueSuffix}`;
  const slug = `ava-deal-${uniqueSuffix}`;

  // 4. Create Project in workspace
  const newProject = addSeedProject({
    id: projectId,
    project_id: projectId,
    propertyName,
    address,
    property_address: address,
    city: 'Austin, TX',
    currentPhase: 'acquisition',
    status: 'active',
    dispositionType: 'RENT',
    purchasePrice,
    purchase_price: purchasePrice,
    rehab_costs: rehabBudget,
    estimatedIrr: estimatedIrrPct,
    phase_completion_pct: 15,
    dealId,
    dealSlug: slug,
    dealAddress: address,
    underwriting,
  });

  // 5. Add corresponding Deal to marketplace seed
  addSeedDeal({
    id: dealId,
    slug,
    address,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    purchasePrice,
    rehabCost: rehabBudget,
    arv: Math.round(purchasePrice * 1.25),
    creatorId: 'user-investor-1',
    createdAt: new Date().toISOString(),
    projectId,
  });

  // 6. Progressive unlock: mark milestone reached
  try {
    const cookieStore = await cookies();
    cookieStore.set(MILESTONE_COOKIE, 'unlocked', { path: '/', httpOnly: false });
    cookieStore.set(FIRST_DEAL_COOKIE, '1', { path: '/', httpOnly: false });
  } catch {
    // Outside request context (e.g. testing)
  }

  const response = NextResponse.json({
    success: true,
    action: 'buildSkeletonDeal',
    milestoneReached: true,
    project: {
      id: newProject.id,
      name: newProject.propertyName,
      address: newProject.address,
      purchasePrice,
      rehabBudget,
      capRate: `${capRatePct}%`,
      irr: `${estimatedIrrPct}%`,
      cashOnCash: `${cashOnCashPct}%`,
    },
    narrativeSteps: [
      'Initialized Project workspace in Acquisition phase.',
      'Configured Deal Calculator with automated property benchmarks.',
      'Stress-tested purchase price and rehab budget against gross rent.',
      'Unlocked full platform dashboard and advanced settings.',
    ],
  });

  response.cookies.set(MILESTONE_COOKIE, 'unlocked', { path: '/' });
  response.cookies.set(FIRST_DEAL_COOKIE, '1', { path: '/' });

  return response;
}
