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

    // Mock/default historical metrics if not already present on the token data
    const noiHistory = data.noiHistory || [
      { date: '2026-01-01', value: 120000 },
      { date: '2026-02-01', value: 125000 }
    ];
    const capRateHistory = data.capRateHistory || [
      { date: '2026-01-01', value: 6.5 },
      { date: '2026-02-01', value: 6.7 }
    ];
    const cashFlowHistory = data.cashFlowHistory || [
      { date: '2026-01-01', value: 8500 },
      { date: '2026-02-01', value: 9200 }
    ];
    const burnRateHistory = data.burnRateHistory || [
      { date: '2026-01-01', value: 1200 },
      { date: '2026-02-01', value: 1100 }
    ];

    const responseDeal = {
      ...data,
      noiHistory,
      capRateHistory,
      cashFlowHistory,
      burnRateHistory
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
    const { idToken, dataURL } = body;

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

    // 4. Save signature and update status to 'used'
    const updates: Record<string, any> = {
      status: 'used',
      signatureDataUrl: dataURL,
      signedAt: new Date(),
      signedBy: decodedToken.email || decodedToken.uid,
      signedByUid: decodedToken.uid
    };

    await tokenRef.update(updates);

    // Also update project/deal if references are available
    const projectId = tokenData.projectId || tokenData.dealId;
    if (projectId) {
      await adminDb.collection('projects').doc(projectId).update({
        signatureDataUrl: dataURL,
        signedAt: new Date(),
        signedBy: decodedToken.email || decodedToken.uid,
        signedByUid: decodedToken.uid
      });
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
