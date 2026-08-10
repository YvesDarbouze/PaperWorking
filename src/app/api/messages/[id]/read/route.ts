import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let readState = true;

    try {
      const body = await req.json();
      if (body && typeof body.read === 'boolean') {
        readState = body.read;
      }
    } catch {
      // default to read = true if no body provided
    }

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // 1. Update Prisma
    const updated = await prisma.message.update({
      where: { id },
      data: { read: readState },
    });

    // 2. Update Firestore
    try {
      await adminDb.collection('messages').doc(id).set({ read: readState }, { merge: true });
      await adminDb.collection('inboxItems').doc(`inb_${id}`).set({ read: readState }, { merge: true });
    } catch (e) {
      console.warn(`[Messages PATCH read] Firestore update skipped for ${id}:`, e);
    }

    return NextResponse.json({
      success: true,
      message: updated,
    });
  } catch (err: any) {
    console.error('[Messages PATCH read Error]', err);
    return NextResponse.json(
      { error: 'Failed to update message read status', message: err.message },
      { status: 500 }
    );
  }
}
