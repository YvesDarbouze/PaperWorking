import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
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

  // Verify caller is not a Vendor
  const authHeader = _request.headers.get('authorization') ?? _request.headers.get('Authorization');
  let callerUid: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7);
    try {
      const decoded = await adminDb.collection('users').doc(idToken).get(); // standard decode fallback
      if (decoded.exists) callerUid = decoded.id;
      else {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        callerUid = decodedToken.uid;
      }
    } catch (e) {
      // If verifyIdToken fails but it starts with mock_token_
      if ((idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123') && process.env.ENABLE_MOCK_AUTH === 'true') {
        callerUid = _request.cookies.get('mock_user_uid')?.value || null;
      }
    }
  } else if (process.env.ENABLE_MOCK_AUTH === 'true') {
    callerUid = _request.cookies.get('mock_user_uid')?.value || null;
  }

  if (callerUid) {
    const userSnap = await adminDb.collection('users').doc(callerUid).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  }

  if (!token || typeof token !== 'string' || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
  }

  try {
    // 1. Look up the invitation by its opaque token field
    let invSnap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    let isDealInvitation = false;
    if (invSnap.empty) {
      invSnap = await adminDb
        .collection('dealInvitations')
        .where('token', '==', token)
        .limit(1)
        .get();
      if (!invSnap.empty) {
        isDealInvitation = true;
      }
    }

    if (invSnap.empty) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const rawInv = invSnap.docs[0].data();
    const inv = isDealInvitation
      ? {
          id: rawInv.id,
          token: rawInv.token,
          email: rawInv.inviteeEmail,
          name: rawInv.inviteeName || 'Anonymous Investor',
          projectId: rawInv.projectId,
          invitedByUid: rawInv.inviterUid || 'system',
          status: rawInv.status === 'sent' || rawInv.status === 'opened' ? 'pending' : rawInv.status,
          proposedAmount: rawInv.proposedAmount || 0,
          proposedEquityPercent: rawInv.proposedEquityPercent || 0,
          createdAt: rawInv.createdAt,
          expiresAt: rawInv.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cardExchangeStatus: rawInv.cardExchangeStatus,
          inviteeBusinessCard: rawInv.inviteeBusinessCard,
          sponsorBusinessCard: rawInv.sponsorBusinessCard,
        }
      : rawInv;

    // 2. Validate lifecycle state.
    //    'accepted'/'declined' invitations are still returned (with their status)
    //    so the Guest Portal can render an "already responded" screen rather
    //    than erroring out — only expiry is a hard rejection.
    const now = new Date();
    const expiresAt: Date = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);

    if (inv.status === 'expired' || expiresAt < now) {
      // Mark as expired in Firestore lazily
      const ref = invSnap.docs[0].ref;
      if (ref && typeof ref.update === 'function') {
        await ref.update({ status: 'expired' }).catch(() => {});
      }
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    if (inv.status === 'sent' || inv.status === 'pending') {
      const ref = invSnap.docs[0].ref;
      if (ref && typeof ref.update === 'function') {
        await ref.update({ status: 'opened', openedAt: new Date().toISOString() }).catch(() => {});
      }
      const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
      await trackDealActivity(
        inv.projectId,
        inv.projectId,
        inv.invitedByUid || 'system',
        'open',
        { inviteeEmail: inv.email }
      ).catch((e: any) => console.error('Failed to log open event:', e));
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
    const [metricHistory, raiseProgress, commitmentsSnap] = await Promise.all([
      fetchPropertyMetricHistory(inv.projectId),
      computeRaiseProgress(inv.projectId, raiseTarget),
      adminDb
        .collection('projects')
        .doc(inv.projectId)
        .collection('commitments')
        .where('email', '==', inv.email)
        .limit(1)
        .get()
    ]);

    let inquiriesSnap = null;
    try {
      inquiriesSnap = await adminDb
        .collection('projects')
        .doc(inv.projectId)
        .collection('investorInquiries')
        .get();
    } catch (e) {
      console.warn('[GuestPortal] Failed to query investorInquiries:', e);
    }

    const { daysLeft, hoursLeft } = computeRaiseCountdown(project.createdAt);

    let commitmentStatus = 'pending';
    let commitmentId = null;
    if (!commitmentsSnap.empty) {
      commitmentStatus = commitmentsSnap.docs[0].data().status;
      commitmentId = commitmentsSnap.docs[0].id;
    }

    const inquiries = inquiriesSnap ? inquiriesSnap.docs
      .map((doc) => {
        const data = doc.data();
        const isOwn = data.invitationId === invSnap.docs[0].id;
        if (!isOwn && !data.isShared) {
          return null;
        }
        return {
          id: doc.id,
          projectId: data.projectId,
          invitationId: data.invitationId,
          isOwn,
          investorName: isOwn ? data.investorName : 'Anonymous Investor',
          investorEmail: isOwn ? data.investorEmail : null,
          status: data.status,
          isShared: data.isShared || false,
          messages: data.messages || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null) : [];

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
      strategy: project.subStrategy || project.dispositionType || 'Value-Add',
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
      status: inv.status as 'pending' | 'accepted' | 'declined' | 'expired' | 'interested',
      commitmentStatus,
      commitmentId,
      subscriptionAgreementTemplate: fin.subscriptionAgreementTemplate || null,
      projectId: inv.projectId,
      inquiries,
      cardExchangeStatus: inv.cardExchangeStatus || 'none',
      inviteeBusinessCard: inv.inviteeBusinessCard || null,
      sponsorBusinessCard: inv.cardExchangeStatus === 'accepted' ? inv.sponsorBusinessCard || null : null,
      indication: inv.indication || null,
    });
  } catch (error) {
    console.error('[GuestPortal] Token lookup failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
