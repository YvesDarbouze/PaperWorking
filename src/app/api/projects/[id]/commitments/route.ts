import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { syncFractionalInvestorFromCommitment } from '@/lib/firebase/syncFractionalInvestors';

/* ═══════════════════════════════════════════════════════════════
   Capital Raise Commitments — collection under projects/{id}

   GET  /api/projects/[id]/commitments
     Returns all commitments for the project, ordered by createdAt.

   POST /api/projects/[id]/commitments
     Body: { name, amountCents, status?, email?, notes? }
     Creates a new commitment document.

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

    return NextResponse.json({ commitments });
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

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, amountCents, status = 'pledged', email, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 422 });
    }
    if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0) {
      return NextResponse.json({ error: 'amountCents must be a positive number' }, { status: 422 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
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
      status,
      email: email?.trim() ?? null,
      notes: notes?.trim() ?? null,
      createdByUid: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(doc);

    await syncFractionalInvestorFromCommitment(projectId, {
      id: docRef.id,
      name: doc.name,
      email: doc.email,
      amountCents: doc.amountCents,
      status: doc.status,
    });

    return NextResponse.json({ id: docRef.id, ...doc }, { status: 201 });
  } catch (err: any) {
    console.error('[Commitments POST]', err.message);
    return NextResponse.json({ error: 'Failed to create commitment' }, { status: 500 });
  }
}
