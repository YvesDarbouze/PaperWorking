import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const deletionScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // 1. Create a request entry in accountDeletionRequests
    await adminDb.collection('accountDeletionRequests').doc(uid).set({
      userId: uid,
      requestedAt: new Date(),
      scheduledAt: deletionScheduledAt,
    });

    // 2. Update user profile to mark deletion pending
    await adminDb.collection('users').doc(uid).update({
      deletionScheduledAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Account deletion scheduled. You have 24 hours to cancel this request.',
      scheduledAt: deletionScheduledAt.toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GDPR delete POST] Error scheduling deletion:', errMsg);
    return NextResponse.json(
      { error: 'Failed to schedule account deletion', details: errMsg },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 1. Remove from accountDeletionRequests
    await adminDb.collection('accountDeletionRequests').doc(uid).delete();

    // 2. Remove the field from the user profile
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const data = userSnap.data() || {};
      if ('deletionScheduledAt' in data) {
        // Update user document using FieldValue.delete
        const { FieldValue } = require('firebase-admin/firestore');
        await userRef.update({
          deletionScheduledAt: FieldValue.delete(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account deletion cancelled successfully.',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GDPR delete DELETE] Error cancelling deletion:', errMsg);
    return NextResponse.json(
      { error: 'Failed to cancel account deletion', details: errMsg },
      { status: 500 }
    );
  }
}
