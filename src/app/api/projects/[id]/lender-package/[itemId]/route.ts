import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, itemId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const itemRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('lenderPackage')
      .doc(itemId);

    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    if ('reminderCadence' in body) {
      const val = body.reminderCadence;
      if (val !== 'daily' && val !== 'weekly' && val !== 'none') {
        return NextResponse.json({ error: 'Invalid reminder cadence' }, { status: 400 });
      }
      updateData.reminderCadence = val;
    }

    if ('status' in body) {
      const val = body.status;
      if (val !== 'Pending' && val !== 'Uploaded') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = val;
    }

    if ('fileId' in body) updateData.fileId = body.fileId;
    if ('fileName' in body) updateData.fileName = body.fileName;
    if ('fileUrl' in body) updateData.fileUrl = body.fileUrl;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    await itemRef.update(updateData);

    const updatedSnap = await itemRef.get();
    return NextResponse.json({ item: { id: itemId, ...updatedSnap.data() } });
  } catch (err: any) {
    console.error('[Lender Package Item PATCH]', err.message);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, itemId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const itemRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('lenderPackage')
      .doc(itemId);

    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    await itemRef.delete();

    return NextResponse.json({ success: true, message: 'Checklist item deleted.' });
  } catch (err: any) {
    console.error('[Lender Package Item DELETE]', err.message);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
}
