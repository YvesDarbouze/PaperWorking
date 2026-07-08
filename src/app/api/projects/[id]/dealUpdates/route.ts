import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════════════
   Deal Updates — sponsor-authored progress posts, subcollection
   under projects/{id}. The "social" layer: investors (including
   external guests via /api/invitations/[token]/updates) see a
   read-only feed of these.

   GET  /api/projects/[id]/dealUpdates
     Returns all updates for the project, newest first.

   POST /api/projects/[id]/dealUpdates
     Body: { title?, body }
     Creates a new update. Author identity is resolved server-side
     from the verified ID token — never trusted from the body.

   Auth: Firebase ID Token (Bearer header)
   Membership: caller must be project owner or member
   ═══════════════════════════════════════════════════════════════ */

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
      .collection('dealUpdates')
      .orderBy('createdAt', 'desc')
      .get();

    const updates = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ updates });
  } catch (err: any) {
    console.error('[DealUpdates GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch deal updates' }, { status: 500 });
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
    const { title, body: updateBody } = body;

    if (!updateBody || typeof updateBody !== 'string' || !updateBody.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 422 });
    }
    if (updateBody.length > 4000) {
      return NextResponse.json({ error: 'body must be 4000 characters or fewer' }, { status: 422 });
    }

    const authorSnap = await adminDb.collection('users').doc(uid).get();
    const authorName = authorSnap.data()?.displayName || authorSnap.data()?.name || 'Sponsor';

    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('dealUpdates')
      .doc();

    const doc = {
      projectId,
      organizationId: project.organizationId ?? null,
      authorUid: uid,
      authorName,
      title: title?.trim() || null,
      body: updateBody.trim(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(doc);

    return NextResponse.json({ id: docRef.id, ...doc }, { status: 201 });
  } catch (err: any) {
    console.error('[DealUpdates POST]', err.message);
    return NextResponse.json({ error: 'Failed to create deal update' }, { status: 500 });
  }
}
