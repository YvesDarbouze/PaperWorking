import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const estimatesSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('loanEstimates')
      .orderBy('createdAt', 'asc')
      .get();

    const estimates = estimatesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ estimates });
  } catch (err: any) {
    console.error('[Loan Estimates GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch loan estimates' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      lenderName,
      amountCents,
      interestRate,
      termMonths,
      points,
      estimatedCostsCents,
      fileId,
      fileName,
      fileUrl,
      loanRecordId,
    } = body;

    // Basic validation
    if (!lenderName || typeof lenderName !== 'string' || lenderName.trim() === '') {
      return NextResponse.json({ error: 'Lender name is required' }, { status: 400 });
    }
    if (typeof amountCents !== 'number' || amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (typeof interestRate !== 'number' || interestRate < 0) {
      return NextResponse.json({ error: 'Interest rate must be non-negative' }, { status: 400 });
    }
    if (typeof termMonths !== 'number' || termMonths <= 0) {
      return NextResponse.json({ error: 'Term months must be greater than zero' }, { status: 400 });
    }

    const estimatesColl = adminDb.collection('projects').doc(projectId).collection('loanEstimates');
    const docRef = estimatesColl.doc();
    const newEstimate = {
      id: docRef.id,
      projectId,
      loanRecordId: loanRecordId || null,
      lenderName: lenderName.trim(),
      amountCents,
      interestRate,
      termMonths,
      points: typeof points === 'number' ? points : 0,
      estimatedCostsCents: typeof estimatedCostsCents === 'number' ? estimatedCostsCents : 0,
      fileId: fileId || null,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      isChosen: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(newEstimate);

    return NextResponse.json({ estimate: newEstimate }, { status: 201 });
  } catch (err: any) {
    console.error('[Loan Estimates POST]', err.message);
    return NextResponse.json({ error: 'Failed to create loan estimate' }, { status: 500 });
  }
}
