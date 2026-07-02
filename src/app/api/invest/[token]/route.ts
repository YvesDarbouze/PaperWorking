import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import type { UserProfile } from '@/types/user';

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const doc = await adminDb.collection('investmentTokens').doc(token).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const data = doc.data()!;

    if (data.status === 'used' || data.status === 'expired') {
      return NextResponse.json({ error: 'Token already used or expired' }, { status: 410 });
    }

    // Check expiry timestamp
    if (data.expiresAt) {
      const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (expiry < new Date()) {
        return NextResponse.json({ error: 'Token expired' }, { status: 410 });
      }
    }

    // Fetch actual historical metrics from database if not present on the token data
    let noiHistory = data.noiHistory || [];
    let capRateHistory = data.capRateHistory || [];
    let cashFlowHistory = data.cashFlowHistory || [];
    let burnRateHistory = data.burnRateHistory || [];

    const projectId = data.projectId || data.dealId;
    if (projectId && (!noiHistory.length || !capRateHistory.length || !cashFlowHistory.length)) {
      try {
        const snapshotsSnap = await adminDb.collection('propertyMetricSnapshots')
          .where('projectId', '==', projectId)
          .where('periodType', '==', 'monthly')
          .get();

        if (!snapshotsSnap.empty) {
          const sortedDocs = snapshotsSnap.docs
            .map(doc => {
              const d = doc.data();
              const rawDate = d.date;
              let dateObj: Date;
              if (rawDate?.toDate) {
                dateObj = rawDate.toDate();
              } else if (rawDate) {
                dateObj = new Date(rawDate);
              } else {
                dateObj = new Date(d.period + '-01T00:00:00Z');
              }
              const dateStr = !isNaN(dateObj.getTime())
                ? dateObj.toISOString().split('T')[0]
                : d.period + '-01';

              return {
                date: dateStr,
                period: d.period,
                noi: d.noi ?? null,
                capRate: d.capRate ?? null,
                monthlyCashFlow: d.monthlyCashFlow ?? null,
              };
            })
            .sort((a, b) => a.period.localeCompare(b.period));

          if (!noiHistory.length) {
            noiHistory = sortedDocs
              .filter(d => d.noi !== null)
              .map(d => ({ date: d.date, value: d.noi as number }));
          }

          if (!capRateHistory.length) {
            capRateHistory = sortedDocs
              .filter(d => d.capRate !== null)
              .map(d => ({ date: d.date, value: d.capRate as number }));
          }

          if (!cashFlowHistory.length) {
            cashFlowHistory = sortedDocs
              .filter(d => d.monthlyCashFlow !== null)
              .map(d => ({ date: d.date, value: d.monthlyCashFlow as number }));
          }
        }
      } catch (dbErr) {
        console.error('Failed to fetch propertyMetricSnapshots:', dbErr);
      }
    }
    let realProjectData: any = null;
    let raiseTarget = 1200000;
    let raiseRaised = 840000;
    let raisePercentage = 70;
    let daysLeft = 4;
    let hoursLeft = 12;

    if (projectId) {
      const projectDoc = await adminDb.collection('projects').doc(projectId).get();
      if (projectDoc.exists) {
        realProjectData = projectDoc.data();
        const target = realProjectData.financials?.capitalRaiseTarget || realProjectData.financials?.projectedRehabCost || 1200000;
        const confirmedCommitments = realProjectData.fractionalInvestors?.filter((i: any) => i.status === 'confirmed') || [];
        const raised = confirmedCommitments.reduce((sum: number, i: any) => sum + (i.contributionAmount || 0), 0) || realProjectData.financials?.committedCapital || 0;
        const pct = target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0;
        
        raiseTarget = target;
        raiseRaised = raised;
        raisePercentage = pct;

        const created = realProjectData.createdAt ? (realProjectData.createdAt.toDate ? realProjectData.createdAt.toDate() : new Date(realProjectData.createdAt)) : new Date();
        const elapsedMs = Date.now() - created.getTime();
        const totalDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
        daysLeft = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        hoursLeft = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      }
    }

    const responseDeal = {
      ...data,
      noiHistory,
      capRateHistory,
      cashFlowHistory,
      burnRateHistory,
      
      // Merged real-time project values if available:
      dealName: realProjectData?.propertyName || data.dealName || 'Untitled Deal',
      propertyAddress: realProjectData?.address || data.propertyAddress || 'Unknown Address',
      purchasePrice: realProjectData?.financials?.purchasePrice ?? data.purchasePrice,
      estimatedARV: realProjectData?.financials?.estimatedCurrentValue ?? data.estimatedARV,
      expectedROI: realProjectData?.financials?.expectedIRR ?? realProjectData?.financials?.roi ?? data.expectedROI ?? 12,
      termMonths: realProjectData?.financials?.loanTermYears ? realProjectData.financials.loanTermYears * 12 : data.termMonths,
      legalEntity: data.legalEntity || realProjectData?.financials?.legalEntity || 'PaperWorking Holdings LLC',
      strategy: realProjectData?.strategyType || 'Value-Add',
      assetClass: realProjectData?.assetClass || 'Multi-Family',
      opportunitySummary: realProjectData?.vision || data.opportunitySummary || data.description || 'Value-add redevelopment project.',
      
      // Raise metrics
      raiseTarget,
      raiseRaised,
      raisePercentage,
      daysLeft,
      hoursLeft,
    };

    return NextResponse.json({ success: true, deal: responseDeal });
  } catch (error) {
    console.error('Investment token lookup failed:', error);
    return NextResponse.json({ error: 'Failed to load investment data' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();
    const { idToken, dataURL, investmentAmount } = body;

    if (!idToken || !dataURL) {
      return NextResponse.json({ error: 'Missing idToken or signature dataURL' }, { status: 400 });
    }

    // 1. Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (authErr) {
      console.error('ID token verification failed:', authErr);
      return NextResponse.json({ error: 'Invalid or expired authentication session' }, { status: 401 });
    }

    // 2. Validate caller eligibility
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const profile = userDoc.data() as UserProfile;
    if (profile.accountType !== 'investor' || !['Individual', 'Team'].includes(profile.subscriptionPlan) || !isSubscriptionActive(profile)) {
      return NextResponse.json({
        error: 'Ineligible to sign LOI. Requires investor account with active Individual or Team subscription plan.'
      }, { status: 403 });
    }

    // 3. Verify token is active
    const tokenRef = adminDb.collection('investmentTokens').doc(token);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Investment token not found' }, { status: 404 });
    }

    const tokenData = tokenDoc.data()!;
    if (tokenData.status !== 'active') {
      return NextResponse.json({ error: 'This token has already been signed or is inactive' }, { status: 400 });
    }

    // Check expiry
    if (tokenData.expiresAt) {
      const expiry = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);
      if (expiry < new Date()) {
        return NextResponse.json({ error: 'This token has expired' }, { status: 400 });
      }
    }

    const finalAmount = investmentAmount && typeof investmentAmount === 'number' && investmentAmount > 0
      ? investmentAmount
      : tokenData.investmentAmount || 25000;

    // 4. Save signature and update status to 'used'
    const updates: Record<string, any> = {
      status: 'used',
      signatureDataUrl: dataURL,
      signedAt: new Date(),
      signedBy: decodedToken.email || decodedToken.uid,
      signedByUid: decodedToken.uid,
      investmentAmount: finalAmount
    };

    await tokenRef.update(updates);

    // Also update project/deal if references are available
    const projectId = tokenData.projectId || tokenData.dealId;
    if (projectId) {
      const projRef = adminDb.collection('projects').doc(projectId);
      const projSnap = await projRef.get();
      if (projSnap.exists) {
        const projData = projSnap.data()!;
        let list = projData.fractionalInvestors || [];
        const emailToFind = decodedToken.email || tokenData.investorEmail;
        const idx = list.findIndex((i: any) => i.email === emailToFind || i.uid === decodedToken.uid);
        
        const purchasePrice = projData.financials?.purchasePrice || 1000000;
        const ownershipFactor = purchasePrice > 0 
          ? (finalAmount / purchasePrice) * 100 
          : 0;

        const investorEntry = {
          uid: decodedToken.uid,
          email: emailToFind,
          name: tokenData.investorName || decodedToken.name || 'Investor',
          contributionAmount: finalAmount,
          ownershipPercentage: Number(ownershipFactor.toFixed(4)),
          status: 'confirmed' as const,
          joinedAt: new Date()
        };

        if (idx >= 0) {
          list[idx] = { ...list[idx], ...investorEntry };
        } else {
          list.push(investorEntry);
        }

        await projRef.update({
          fractionalInvestors: list,
          signatureDataUrl: dataURL,
          signedAt: new Date(),
          signedBy: decodedToken.email || decodedToken.uid,
          signedByUid: decodedToken.uid
        });
      }
    }

    const loiId = tokenData.loiId;
    if (loiId) {
      await adminDb.collection('loi').doc(loiId).update({
        signatureDataUrl: dataURL,
        signedAt: new Date(),
        status: 'signed',
        signedBy: decodedToken.email || decodedToken.uid,
        signedByUid: decodedToken.uid
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signature submission failed:', error);
    return NextResponse.json({ error: 'Failed to record signature' }, { status: 500 });
  }
}
