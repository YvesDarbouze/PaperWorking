import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { fetchPropertyMetricHistory, computeRaiseCountdown, computeRaiseProgress } from '@/lib/reporting/propertyMetricHistory';

/* ═══════════════════════════════════════════════════════
   GET /api/invitations/[token]

   Public endpoint (no auth required — accessed by the investor
   before they have a PaperWorking account).

   Resolves an invitation token to the safe subset of deal data
   required to render the Guest Portal (LOI terms + property metrics).

   Security model:
     - Token is a 32-char opaque random string — not guessable.
     - Only returns fields explicitly allowlisted below.
     - Expired or used invitations are rejected.
     - No internal IDs (orgId, Firestore docIds) are exposed to the client.
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
  }

  try {
    // 1. Look up the invitation by its opaque token field
    const invSnap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (invSnap.empty) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const inv = invSnap.docs[0].data();

    // 2. Validate lifecycle state.
    //    'accepted'/'declined' invitations are still returned (with their status)
    //    so the Guest Portal can render an "already responded" screen rather
    //    than erroring out — only expiry is a hard rejection.
    const now = new Date();
    const expiresAt: Date = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);

    if (inv.status === 'expired' || expiresAt < now) {
      // Mark as expired in Firestore lazily
      await invSnap.docs[0].ref.update({ status: 'expired' }).catch(() => {});
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    // 3. Fetch the associated project for property metrics
    const projectSnap = await adminDb.collection('projects').doc(inv.projectId).get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Associated deal no longer exists.' }, { status: 404 });
    }

    const project = projectSnap.data()!;
    const fin = project.financials ?? {};

    // 4. Additional computed fields for the Guest Portal's thesis/charts/raise sections.
    //    Raise progress is computed from the real commitments subcollection (status-aware),
    //    never from the legacy fractionalInvestors array.
    const raiseTarget = fin.capitalRaiseTarget || fin.projectedRehabCost || 0;
    const [metricHistory, raiseProgress] = await Promise.all([
      fetchPropertyMetricHistory(inv.projectId),
      computeRaiseProgress(inv.projectId, raiseTarget),
    ]);
    const { daysLeft, hoursLeft } = computeRaiseCountdown(project.createdAt);

    // 5. Return only the allowlisted fields needed by the Guest Portal
    //    — no internal IDs, no organizationId, no Firestore doc references
    return NextResponse.json({
      // Investor identity
      investorName: inv.name,
      investorEmail: inv.email,

      // Property info
      dealName: inv.dealName || project.propertyName || 'Untitled Deal',
      propertyAddress: [
        project.address?.street,
        project.address?.city,
        project.address?.state,
        project.address?.zip,
      ]
        .filter(Boolean)
        .join(', ') || project.propertyAddress || '',
      strategy: project.strategyType || 'Value-Add',
      assetClass: project.assetClass || 'Multi-Family',
      opportunitySummary: project.vision || inv.opportunitySummary || project.description || '',

      // Key metrics
      purchasePrice: fin.purchasePrice ?? 0,
      estimatedARV: fin.estimatedARV ?? fin.estimatedCurrentValue ?? 0,
      expectedROI: fin.expectedROI ?? fin.expectedIRR ?? fin.roi ?? 0,

      // LOI Terms (from invitation record — source of truth)
      investmentAmount: inv.proposedAmount ?? 0,
      equitySplit: inv.proposedEquityPercent ?? 0,
      interestRate: fin.interestRate ?? 0,
      termMonths: fin.termMonths ?? (fin.loanTermYears ? fin.loanTermYears * 12 : 12),
      legalEntity: project.legalEntity || inv.legalEntity || '',

      // Raise progress (from commitments, status-aware)
      raiseTarget,
      raiseRaised: raiseProgress.raiseRaised,
      raisePercentage: raiseProgress.raisePercentage,
      daysLeft,
      hoursLeft,

      // Financial history for charts
      noiHistory: metricHistory.noiHistory,
      capRateHistory: metricHistory.capRateHistory,
      cashFlowHistory: metricHistory.cashFlowHistory,
      burnRateHistory: [] as { date: string; value: number }[],

      // Meta
      expiresAt: expiresAt.toISOString(),
      status: inv.status as 'pending' | 'accepted' | 'declined' | 'expired',
    });
  } catch (error) {
    console.error('[GuestPortal] Token lookup failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
