import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { syncFractionalInvestorFromCommitment, removeFractionalInvestorForCommitment } from '@/lib/firebase/syncFractionalInvestors';

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id]/commitments/[cId]
     Body: { status?, amountCents?, name?, email?, notes? }
     Updates a commitment. Only the fields present in the body
     are written; absent fields are left unchanged.

   DELETE /api/projects/[id]/commitments/[cId]
     Removes the commitment document.

   Auth: Firebase ID Token (Bearer header)
   Membership: caller must be project owner or member
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, cId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('commitments')
      .doc(cId);

    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Commitment not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = existing.data()!;
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 422 }
        );
      }
      updates.status = body.status;

      if (body.status !== updated.status) {
        const transition = {
          fromStatus: updated.status || null,
          toStatus: body.status,
          timestamp: new Date().toISOString(),
          actor: auth.token.email || auth.token.name || auth.uid,
          evidence: body.evidence || null,
        };
        if (typeof FieldValue.arrayUnion === 'function') {
          updates.transitions = FieldValue.arrayUnion(transition);
        } else {
          const existingTransitions = updated.transitions || [];
          updates.transitions = [...existingTransitions, transition];
        }
      }
    }
    if (body.amountCents !== undefined) {
      if (typeof body.amountCents !== 'number' || body.amountCents <= 0) {
        return NextResponse.json({ error: 'amountCents must be a positive number' }, { status: 422 });
      }
      updates.amountCents = Math.round(body.amountCents);
    }
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.email !== undefined) updates.email = body.email ? String(body.email).trim() : null;
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;
    if (body.partyType !== undefined) {
      const VALID_PARTY_TYPES = ['Sponsor', 'Investor', 'Co-GP', 'Preferred Equity'];
      if (!VALID_PARTY_TYPES.includes(body.partyType)) {
        return NextResponse.json({ error: `partyType must be one of: ${VALID_PARTY_TYPES.join(', ')}` }, { status: 422 });
      }
      updates.partyType = body.partyType;
    }

    if (body.status === 'docs-out' && updated.status !== 'docs-out') {
      const dealDocRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('documents')
        .doc(`sub_agreement_${cId}`);
      
      const docSnap = await dealDocRef.get();
      if (!docSnap.exists) {
        await dealDocRef.set({
          id: `sub_agreement_${cId}`,
          projectId,
          category: 'Other',
          fileName: `Subscription_Agreement_${(updates.name ?? updated.name).replace(/\s+/g, '_')}.pdf`,
          fileUrl: 'https://example.com/mock-subscription-agreement.pdf',
          uploadedByUid: uid,
          uploadedByName: auth.token.name || 'Sponsor',
          uploadedAt: new Date(),
          eSignStatus: 'Not Required',
        });
      }
    }

    if (body.status === 'funds-confirmed' && updated.status !== 'funds-confirmed' && updated.status !== 'cleared') {
      const ledgerItemRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('ledgerItems')
        .doc();
      await ledgerItemRef.set({
        id: ledgerItemRef.id,
        projectId,
        organizationId: project.organizationId || '',
        type: 'receipt',
        category: 'Other',
        description: `Capital Contribution: ${updates.name ?? updated.name}`,
        amount: (updates.amountCents ?? updated.amountCents) / 100,
        status: 'Approved',
        submittedByUid: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await docRef.update(updates);

    // Keep the legacy fractionalInvestors[] view (read by equity/distribution
    // calculators) in sync with this commitment's latest status/amount.
    await syncFractionalInvestorFromCommitment(projectId, {
      id: cId,
      name: updates.name ?? updated.name,
      email: updates.email !== undefined ? updates.email : updated.email,
      amountCents: updates.amountCents ?? updated.amountCents,
      status: (updates.status ?? updated.status) as CommitmentStatus,
      partyType: updates.partyType !== undefined ? updates.partyType : updated.partyType,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Commitments PATCH]', err.message);
    return NextResponse.json({ error: 'Failed to update commitment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, cId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('commitments')
      .doc(cId);

    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Commitment not found' }, { status: 404 });
    }

    await docRef.delete();
    await removeFractionalInvestorForCommitment(projectId, cId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Commitments DELETE]', err.message);
    return NextResponse.json({ error: 'Failed to delete commitment' }, { status: 500 });
  }
}
