import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/projects/[id]/dealUpdates/[updateId]
     Removes a deal update document.

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, updateId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const docRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('dealUpdates')
      .doc(updateId);

    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Deal update not found' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DealUpdates DELETE]', err.message);
    return NextResponse.json({ error: 'Failed to delete deal update' }, { status: 500 });
  }
}
