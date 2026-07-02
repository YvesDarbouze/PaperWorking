import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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

type CommitmentStatus = 'pledged' | 'transferred' | 'cleared';
const VALID_STATUSES: CommitmentStatus[] = ['pledged', 'transferred', 'cleared'];

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
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 422 }
        );
      }
      updates.status = body.status;
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

    await docRef.update(updates);

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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Commitments DELETE]', err.message);
    return NextResponse.json({ error: 'Failed to delete commitment' }, { status: 500 });
  }
}
