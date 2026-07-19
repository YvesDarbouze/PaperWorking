import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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

    const loansSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('loans')
      .orderBy('createdAt', 'asc')
      .get();

    const loans = loansSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ loans });
  } catch (err: any) {
    console.error('[Loans GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
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
    const { instrument, reset = false } = body;

    const projectRef = adminDb.collection('projects').doc(projectId);
    const loansColl = projectRef.collection('loans');

    // 1. Clear any existing loan records first
    const existingSnap = await loansColl.get();
    const batch = adminDb.batch();
    existingSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // 2. Handle Reset / All Cash
    if (reset || !instrument) {
      await projectRef.update({
        'financials.financingType': 'All Cash',
        loanStatus: FieldValue.delete(),
      });

      try {
        await telemetry.capture({
          distinctId: uid,
          event: 'financing_route_reset',
          properties: { projectId, timestamp: new Date().toISOString() }
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Financing route reset to All Cash.' });
    }

    // Validate instrument
    const VALID_INSTRUMENTS = ['Conventional', 'Hard Money', 'Bridge', 'SBA 504'];
    if (!VALID_INSTRUMENTS.includes(instrument)) {
      return NextResponse.json({ error: `instrument must be one of: ${VALID_INSTRUMENTS.join(', ')}` }, { status: 422 });
    }

    // 3. Create new loan record(s)
    const newLoans: any[] = [];

    if (instrument === 'SBA 504') {
      // SBA 504 creates 2 loan records (Bank First Lien and CDC Debenture Second Lien)
      const docRef1 = loansColl.doc();
      const doc1 = {
        id: docRef1.id,
        projectId,
        instrument,
        lenderName: 'SBA 504 First Lien Bank',
        amountCents: 0,
        interestRate: 0,
        termMonths: 120,
        points: 0,
        status: 'Application-Submitted',
        notes: 'Bank 50% First Lien Loan',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await docRef1.set(doc1);
      newLoans.push(doc1);

      const docRef2 = loansColl.doc();
      const doc2 = {
        id: docRef2.id,
        projectId,
        instrument,
        lenderName: 'CDC Debenture Second Lien',
        amountCents: 0,
        interestRate: 0,
        termMonths: 240,
        points: 0,
        status: 'Application-Submitted',
        notes: 'CDC 35-40% Debenture Second Lien',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await docRef2.set(doc2);
      newLoans.push(doc2);
    } else {
      // Conventional, Hard Money, or Bridge creates 1 loan record
      const docRef = loansColl.doc();
      const doc = {
        id: docRef.id,
        projectId,
        instrument,
        lenderName: `${instrument} Lender`,
        amountCents: 0,
        interestRate: 0,
        termMonths: instrument === 'Conventional' ? 360 : 12,
        points: 0,
        status: 'Application-Submitted',
        notes: `${instrument} loan record`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await docRef.set(doc);
      newLoans.push(doc);
    }

    // 4. Update project modality / financingType
    await projectRef.update({
      'financials.financingType': 'Financed',
      loanStatus: 'Application-Submitted',
    });

    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'financing_route_selected',
        properties: { projectId, instrument, timestamp: new Date().toISOString() }
      });
    } catch {}

    return NextResponse.json({ success: true, loans: newLoans }, { status: 201 });
  } catch (err: any) {
    console.error('[Loans POST]', err.message);
    return NextResponse.json({ error: 'Failed to configure financing route' }, { status: 500 });
  }
}
