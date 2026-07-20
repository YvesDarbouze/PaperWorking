import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { telemetry } from '@/lib/telemetry';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, estimateId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Only Lead Investors can choose/promote loan estimates
    if (access.role !== 'Lead Investor') {
      return NextResponse.json({ error: 'Forbidden: only Lead Investors can choose loan estimates' }, { status: 403 });
    }

    const project = access.project;

    const projectRef = adminDb.collection('projects').doc(projectId);
    const estimateRef = projectRef.collection('loanEstimates').doc(estimateId);
    const estimateSnap = await estimateRef.get();

    if (!estimateSnap.exists) {
      return NextResponse.json({ error: 'Estimate candidate not found' }, { status: 404 });
    }

    const estimate = estimateSnap.data()!;

    // 1. Mark this candidate as chosen, and all others as not chosen
    const allEstimatesSnap = await projectRef.collection('loanEstimates').get();
    const batch = adminDb.batch();

    allEstimatesSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isChosen: doc.id === estimateId,
        updatedAt: new Date().toISOString(),
      });
    });

    // 2. Identify the active LoanRecord to update
    const loansColl = projectRef.collection('loans');
    let loanDocRef;

    if (estimate.loanRecordId) {
      loanDocRef = loansColl.doc(estimate.loanRecordId);
    } else {
      // Fallback: update the first active loan record
      const loansSnap = await loansColl.orderBy('createdAt', 'asc').limit(1).get();
      if (loansSnap.empty) {
        return NextResponse.json({ error: 'No active loan record found. Please configure a financing route first.' }, { status: 400 });
      }
      loanDocRef = loansSnap.docs[0].ref;
    }

    // 3. Update active LoanRecord
    batch.update(loanDocRef, {
      lenderName: estimate.lenderName,
      amountCents: estimate.amountCents,
      interestRate: estimate.interestRate,
      termMonths: estimate.termMonths,
      points: estimate.points,
      estimatedCostsCents: estimate.estimatedCostsCents,
      fileId: estimate.fileId,
      fileName: estimate.fileName,
      fileUrl: estimate.fileUrl,
      sourceTags: estimate.sourceTags || null,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'loan_estimate_chosen',
        properties: {
          projectId,
          estimateId,
          lenderName: estimate.lenderName,
          amountCents: estimate.amountCents,
          interestRate: estimate.interestRate,
          timestamp: new Date().toISOString()
        }
      });
    } catch {}

    return NextResponse.json({ success: true, message: 'Loan estimate chosen and synced to active loan.' });
  } catch (err: any) {
    console.error('[Choose Estimate POST]', err.message);
    return NextResponse.json({ error: 'Failed to choose estimate' }, { status: 500 });
  }
}
