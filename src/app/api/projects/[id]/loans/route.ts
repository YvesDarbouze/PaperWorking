import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { telemetry } from '@/lib/telemetry';
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

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Only Lead Investors can select/reset financing routes
    if (access.role !== 'Lead Investor') {
      return NextResponse.json({ error: 'Forbidden: only Lead Investors can select financing routes' }, { status: 403 });
    }

    const project = access.project;

    const body = await request.json();
    const { instrument, instruments, reset = false } = body;

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
    if (reset || (!instrument && (!instruments || (Array.isArray(instruments) && instruments.length === 0)))) {
      const updateData: any = {
        'financials.financingType': 'All Cash',
        loanStatus: FieldValue.delete(),
      };
      if (project.fundingPlan?.modality) {
        const currentModality: string[] = project.fundingPlan.modality || [];
        const nextModality = currentModality.filter(m => m !== 'conventional_loan' && m !== 'hard_money' && m !== 'bridge' && m !== 'sba_504_bank' && m !== 'sba_504_cdc');
        updateData['fundingPlan.modality'] = nextModality;
      }

      await projectRef.update(updateData);

      try {
        await telemetry.capture({
          distinctId: uid,
          event: 'financing_route_reset',
          properties: { projectId, timestamp: new Date().toISOString() }
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Financing route reset to All Cash.' });
    }

    // Normalize to array of selected instruments
    let selectedInstruments: string[] = [];
    if (Array.isArray(instruments)) {
      selectedInstruments = instruments;
    } else if (typeof instrument === 'string' && instrument) {
      selectedInstruments = [instrument];
    }

    // Validate selected instruments
    const VALID_INSTRUMENTS = ['Conventional', 'Hard Money', 'Bridge', 'SBA 504'];
    for (const inst of selectedInstruments) {
      if (!VALID_INSTRUMENTS.includes(inst)) {
        return NextResponse.json({ error: `instrument must be one of: ${VALID_INSTRUMENTS.join(', ')}` }, { status: 422 });
      }
    }

    // 3. Create new loan record(s) sequentially (so mock subDoc.set works in Jest)
    const newLoans: any[] = [];

    for (const inst of selectedInstruments) {
      if (inst === 'SBA 504') {
        const docRef1 = loansColl.doc();
        const doc1 = {
          id: docRef1.id,
          projectId,
          instrument: inst,
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
          instrument: inst,
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
        const docRef = loansColl.doc();
        const doc = {
          id: docRef.id,
          projectId,
          instrument: inst,
          lenderName: `${inst} Lender`,
          amountCents: 0,
          interestRate: 0,
          termMonths: inst === 'Conventional' ? 360 : 12,
          points: 0,
          status: 'Application-Submitted',
          notes: `${inst} loan record`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await docRef.set(doc);
        newLoans.push(doc);
      }
    }

    // 4. Update project modality / financingType
    const updateData: any = {
      'financials.financingType': 'Financed',
      loanStatus: 'Application-Submitted',
    };

    if (project.fundingPlan?.modality) {
      const currentModality: string[] = project.fundingPlan.modality || [];
      const nextModality = currentModality.filter(m => m !== 'conventional_loan' && m !== 'hard_money' && m !== 'bridge' && m !== 'sba_504_bank' && m !== 'sba_504_cdc');
      
      if (selectedInstruments.includes('Conventional')) nextModality.push('conventional_loan');
      if (selectedInstruments.includes('Hard Money')) nextModality.push('hard_money');
      if (selectedInstruments.includes('Bridge')) nextModality.push('bridge');
      if (selectedInstruments.includes('SBA 504')) {
        nextModality.push('sba_504_bank');
        nextModality.push('sba_504_cdc');
      }
      updateData['fundingPlan.modality'] = nextModality;
    }

    await projectRef.update(updateData);

    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'financing_route_selected',
        properties: { projectId, instruments: selectedInstruments, timestamp: new Date().toISOString() }
      });
    } catch {}

    return NextResponse.json({ success: true, loans: newLoans }, { status: 201 });
  } catch (err: any) {
    console.error('[Loans POST]', err.message);
    return NextResponse.json({ error: 'Failed to configure financing route' }, { status: 500 });
  }
}
