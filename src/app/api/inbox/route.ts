import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { CreateInboxItemRequest } from '@/types/inbox';

export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════
   POST /api/inbox

   Creates an inbox item in the top-level `inboxItems`
   Firestore collection. Auth via Bearer token.
   ═══════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // ── Body validation ──────────────────────────────
    const body: CreateInboxItemRequest = await request.json();
    const { recipientUid, organizationId, type, category, title, body: itemBody, senderName } = body;

    if (!recipientUid || !organizationId || !type || !category || !title || !itemBody || !senderName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: recipientUid, organizationId, type, category, title, body, senderName' },
        { status: 400 },
      );
    }

    // ── Generate ID & build document ─────────────────
    const itemId = `inb_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

    const inboxItem = {
      id: itemId,
      recipientUid,
      organizationId,
      type,
      category,
      title,
      body: itemBody,
      senderUid: body.senderUid || uid,
      senderName,
      senderAvatarInitial: senderName[0].toUpperCase(),
      projectId: body.projectId || null,
      projectName: body.projectName || null,
      invitationId: body.invitationId || null,
      threadId: body.threadId || null,
      actionUrl: body.actionUrl || null,
      read: false,
      archived: false,
      createdAt: new Date(),
      ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {}),
    };

    // ── Persist to Firestore ─────────────────────────
    await adminDb.collection('inboxItems').doc(itemId).set(inboxItem);

    console.log(`[Inbox] Created inbox item: ${itemId} for user ${recipientUid}`);

    return NextResponse.json({ success: true, itemId });
  } catch (error: any) {
    console.error('[Inbox] Error creating inbox item:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ success: false, error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
