import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
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

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Enforce LP/Vendor access controls
    if (access.role === 'LP') {
      return NextResponse.json({ error: 'Access denied: LPs cannot add loan estimates.' }, { status: 403 });
    }
    if (access.role === 'Vendor') {
      const isLenderOrAppraiser = ['f4HardMoneyLenderVendor', 'f4CdcVendor', 'f4AppraiserVendor'].includes(access.partyId || '');
      if (!isLenderOrAppraiser) {
        return NextResponse.json({ error: 'Access denied: Vendor is not authorized to add loan estimates.' }, { status: 403 });
      }
    }

    const project = access.project;

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

    const hasDoc = !!fileId;
    const sourceTags = body.sourceTags || {
      lenderName: hasDoc ? 'document' : 'manual',
      amountCents: hasDoc ? 'document' : 'manual',
      interestRate: hasDoc ? 'document' : 'manual',
      termMonths: hasDoc ? 'document' : 'manual',
      points: hasDoc ? 'document' : 'manual',
      estimatedCostsCents: hasDoc ? 'document' : 'manual',
    };

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
      sourceTags,
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
