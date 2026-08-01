import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inquiryId: string }> }
) {
  const { id: projectId, inquiryId } = await params;

  try {
    // 1. Authenticate Lead Investor
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 2. Fetch Project & Verify Access
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectSnap.data()!;
    const isOwner = projectData.ownerUid === uid;
    let isAuthorized = isOwner;

    if (!isAuthorized && projectData.organizationId) {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists && userSnap.data()?.organizationId === projectData.organizationId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 3. Parse Body
    const body = await request.json();
    const { isShared, status } = body;

    const inquiryRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('investorInquiries')
      .doc(inquiryId);

    const inquirySnap = await inquiryRef.get();
    if (!inquirySnap.exists) {
      return NextResponse.json({ error: 'Inquiry thread not found.' }, { status: 404 });
    }

    const inquiryData = inquirySnap.data()!;
    const oldShared = !!inquiryData.isShared;

    const update: any = {};
    if (typeof isShared === 'boolean') update.isShared = isShared;
    if (status === 'open' || status === 'answered') update.status = status;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updates provided.' }, { status: 400 });
    }

    const batch = adminDb.batch();
    batch.update(inquiryRef, update);

    // 4. If toggling isShared from false to true → Write QNA_SHARED Ledger event
    if (update.isShared === true && !oldShared) {
      const firstQuestion = inquiryData.message || (inquiryData.messages?.[0]?.text) || '';
      const firstAnswer = (inquiryData.messages || []).find((m: any) => m.sender === 'leadInvestor')?.text || '';

      const ledgerRef = adminDb.collection('projects').doc(projectId)
        .collection('dealLedger').doc();

      batch.set(ledgerRef, {
        id: ledgerRef.id,
        projectId,
        listingId: projectData.activeListingId || '',
        eventType: 'QNA_SHARED',
        performedBy: uid, // LeadInvestor who shared it
        timestamp: new Date().toISOString(),
        version: projectData.version || 1,
        visibilityMode: projectData.visibilityMode || 'PRIVATE',
        metadata: {
          inquiryId,
          question: firstQuestion,
          answer: firstAnswer,
        },
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Projects/Inquiries/Patch] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
