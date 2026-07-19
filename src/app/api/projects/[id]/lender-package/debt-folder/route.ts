import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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

    const foldersColl = adminDb.collection('projectFolders');
    const folderQuery = await foldersColl
      .where('projectId', '==', projectId)
      .where('name', '==', 'Debt')
      .limit(1)
      .get();

    if (!folderQuery.empty) {
      const folderDoc = folderQuery.docs[0];
      return NextResponse.json({ folderId: folderDoc.id });
    }

    // Provision the Debt folder
    const folderRef = foldersColl.doc();
    const folderId = folderRef.id;
    await folderRef.set({
      id: folderId,
      projectId,
      organizationId: project.organizationId || '',
      name: 'Debt',
      phase: 'Find & Fund',
      ownerUid: project.ownerUid || uid,
      fileCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ folderId }, { status: 201 });
  } catch (err: any) {
    console.error('[Debt Folder POST]', err.message);
    return NextResponse.json({ error: 'Failed to ensure Debt folder' }, { status: 500 });
  }
}
