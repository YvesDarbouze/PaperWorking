import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { UpdateInboxItemRequest } from '@/types/inbox';

export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════
   PATCH /api/inbox/[id]

   Updates an inbox item's read/archived/actionTaken state.
   Only the recipient can update their own items.
   ═══════════════════════════════════════════════════════ */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // ── Auth ──────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ── Fetch & verify ownership ─────────────────────
    const docRef = adminDb.collection('inboxItems').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Inbox item not found' }, { status: 404 });
    }

    if (docSnap.data()?.recipientUid !== uid) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // ── Build update payload (whitelist allowed fields) ──
    const body: UpdateInboxItemRequest = await request.json();
    const updateData: Record<string, any> = {};

    if (typeof body.read === 'boolean') {
      updateData.read = body.read;
      if (body.read) {
        updateData.readAt = new Date();
      }
    }
    if (typeof body.archived === 'boolean') {
      updateData.archived = body.archived;
    }
    if (body.actionTaken) {
      updateData.actionTaken = body.actionTaken;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    await docRef.update(updateData);

    console.log(`[Inbox] Updated item ${id} for user ${uid}:`, Object.keys(updateData));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Inbox] Error updating inbox item:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ success: false, error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/* ═══════════════════════════════════════════════════════
   DELETE /api/inbox/[id]

   Permanently deletes an inbox item.
   Only the recipient can delete their own items.
   ═══════════════════════════════════════════════════════ */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // ── Auth ──────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ── Fetch & verify ownership ─────────────────────
    const docRef = adminDb.collection('inboxItems').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Inbox item not found' }, { status: 404 });
    }

    if (docSnap.data()?.recipientUid !== uid) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await docRef.delete();

    console.log(`[Inbox] Deleted item ${id} for user ${uid}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Inbox] Error deleting inbox item:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ success: false, error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
