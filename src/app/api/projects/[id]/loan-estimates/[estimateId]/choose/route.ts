import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { telemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

async function verifyProjectMembership(projectId: string, uid: string) {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const isOwner = data.ownerUid === uid;
  const isMember = !!data.members?.[uid] || data.teamMemberIds?.includes(uid);
  const isOrgMember = data.organizationId
    ? await adminDb.collection('organizations').doc(data.organizationId).get().then((o) => {
        if (!o.exists) return false;
        const od = o.data()!;
        return od.ownerUid === uid || od.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');
      })
    : false;
  if (!isOwner && !isMember && !isOrgMember) return null;
  return data;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; estimateId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, estimateId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

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
