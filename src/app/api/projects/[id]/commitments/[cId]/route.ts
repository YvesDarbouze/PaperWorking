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
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;
    const email = auth.token.email;

    const { id: projectId, cId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, email);
    if (!access) {
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

    const updated = existing.data()!;

    // Enforce LP/co-buyer permissions and ownership checks
    if (access.role !== 'Lead Investor') {
      const lowerEmail = email?.toLowerCase();
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      const claimedEmails: string[] = userData?.claimedEmails || [];
      const allUserEmails = [lowerEmail, ...claimedEmails.map(e => e.toLowerCase())].filter(Boolean) as string[];

      const isOwner = (existing.data()?.email && allUserEmails.includes(existing.data()?.email.toLowerCase())) ||
                      existing.data()?.uid === uid ||
                      existing.data()?.createdByUid === uid;
      if (!isOwner) {
        return NextResponse.json({ error: 'Access denied: cannot modify another investor\'s commitment' }, { status: 403 });
      }

      const canEdit = access.phasePermissions?.['phase-2']?.canEdit ?? true;
      if (!canEdit) {
        return NextResponse.json({ error: 'Edit permission denied for this phase' }, { status: 403 });
      }
    }

    const body = await request.json();

    // Prevent LPs/co-buyers from updating/transferring the email or changing partyType
    if (access.role !== 'Lead Investor') {
      if (body.email !== undefined && body.email !== updated.email) {
        return NextResponse.json({ error: 'Cannot change email on an existing commitment' }, { status: 403 });
      }
      if (body.partyType !== undefined && body.partyType !== updated.partyType) {
        return NextResponse.json({ error: 'Cannot change partyType on an existing commitment' }, { status: 403 });
      }
    }

    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 422 }
        );
      }
      if (access.role !== 'Lead Investor') {
        const PRIVILEGED_STATUSES = ['transferred', 'cleared', 'docs-out', 'funds-confirmed'];
        if (PRIVILEGED_STATUSES.includes(body.status)) {
          return NextResponse.json({ error: 'Cannot self-clear or self-verify commitments' }, { status: 403 });
        }
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
    if (body.email !== undefined && access.role === 'Lead Investor') {
      updates.email = body.email ? String(body.email).trim() : null;
    }
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;
    if (body.partyType !== undefined && access.role === 'Lead Investor') {
      const VALID_PARTY_TYPES = ['LeadInvestor', 'Investor', 'Co-GP', 'Preferred Equity'];
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
          uploadedByName: auth.token.name || 'LeadInvestor',
          uploadedAt: new Date(),
          eSignStatus: 'Not Required',
          recipientEmail: updates.email ?? updated.email ?? null,
          recipientUid: updates.createdByUid ?? updated.createdByUid ?? null,
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
        organizationId: access.project.organizationId || '',
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
    const email = auth.token.email;

    const { id: projectId, cId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Only Lead Investors can delete commitments
    if (access.role !== 'Lead Investor') {
      return NextResponse.json({ error: 'Forbidden: only Lead Investors can delete commitments' }, { status: 403 });
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
