import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { syncFractionalInvestorFromCommitment } from '@/lib/firebase/syncFractionalInvestors';

/* ═══════════════════════════════════════════════════════════════
   Capital Raise Commitments — collection under projects/{id}

   GET  /api/projects/[id]/commitments
     Returns all commitments for the project, ordered by createdAt.
     LPs and co-buyers only see their own commitments.

   POST /api/projects/[id]/commitments
     Body: { name, amountCents, status?, email?, notes? }
     Creates a new commitment document.
     For LPs/co-buyers, forces email = auth email to prevent spoofing.

   Auth: Firebase ID Token (Bearer header)
   ═══════════════════════════════════════════════════════════════ */

import { CommitmentStatus } from '@/types/schema';

const VALID_STATUSES: CommitmentStatus[] = [
  'pledged',
  'transferred',
  'cleared',
  'soft-committed',
  'docs-out',
  'signed',
  'funds-confirmed'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    const email = auth.token.email;

    const { id: projectId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const snap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('commitments')
      .orderBy('createdAt', 'asc')
      .get();

    const commitments = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    let filteredCommitments = commitments;
    if (access.role !== 'Lead Investor') {
      const lowerEmail = email?.toLowerCase();
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      const claimedEmails: string[] = userData?.claimedEmails || [];
      const allUserEmails = [lowerEmail, ...claimedEmails.map(e => e.toLowerCase())].filter(Boolean) as string[];

      filteredCommitments = commitments.filter((c: any) => 
        (c.email && allUserEmails.includes(c.email.toLowerCase())) || 
        c.uid === uid ||
        c.createdByUid === uid
      );
    }

    return NextResponse.json({ commitments: filteredCommitments });
  } catch (err: any) {
    console.error('[Commitments GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch commitments' }, { status: 500 });
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
    const email = auth.token.email;

    const { id: projectId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Enforce phase-2 edit permissions for LPs/co-buyers
    if (access.role !== 'Lead Investor') {
      const canEdit = access.phasePermissions?.['phase-2']?.canEdit ?? true;
      if (!canEdit) {
        return NextResponse.json({ error: 'Edit permission denied for this phase' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, amountCents, status = 'pledged', notes, partyType = 'Investor' } = body;

    let targetStatus = status;
    if (access.role !== 'Lead Investor') {
      targetStatus = 'pledged';
    }

    // Overwrite input email and createdByUid with verified auth values for LPs/co-buyers
    const targetEmail = access.role === 'Lead Investor' ? (body.email?.trim() || null) : (email || null);

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 422 });
    }
    if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0) {
      return NextResponse.json({ error: 'amountCents must be a positive number' }, { status: 422 });
    }
    if (!VALID_STATUSES.includes(targetStatus)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
    }
    const VALID_PARTY_TYPES = ['LeadInvestor', 'Investor', 'Co-GP', 'Preferred Equity'];
    if (!VALID_PARTY_TYPES.includes(partyType)) {
      return NextResponse.json({ error: `partyType must be one of: ${VALID_PARTY_TYPES.join(', ')}` }, { status: 422 });
    }

    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('commitments')
      .doc();

    const doc = {
      projectId,
      name: name.trim(),
      amountCents: Math.round(amountCents),
      status: targetStatus,
      email: targetEmail,
      notes: notes?.trim() ?? null,
      partyType,
      createdByUid: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      transitions: [
        {
          fromStatus: null,
          toStatus: targetStatus,
          timestamp: new Date().toISOString(),
          actor: auth.token.email || auth.token.name || auth.uid,
          evidence: 'Initial Commitment recorded'
        }
      ]
    };

    await docRef.set(doc);

    await syncFractionalInvestorFromCommitment(projectId, {
      id: docRef.id,
      name: doc.name,
      email: doc.email,
      amountCents: doc.amountCents,
      status: doc.status,
      partyType: doc.partyType as any,
    });

    const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
    await trackDealActivity(
      projectId,
      projectId,
      uid,
      'indication',
      {
        inviteeEmail: targetEmail || '',
        inviteeName: name,
        amountCents: Math.round(amountCents),
        status: targetStatus,
      }
    ).catch((e: any) => console.error('Failed to log indication event:', e));

    return NextResponse.json({ id: docRef.id, ...doc }, { status: 201 });
  } catch (err: any) {
    console.error('[Commitments POST]', err.message);
    return NextResponse.json({ error: 'Failed to create commitment' }, { status: 500 });
  }
}
