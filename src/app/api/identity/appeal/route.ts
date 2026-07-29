import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const userData = userSnap.data()!;
    if (userData.invitationSuspended !== true) {
      return NextResponse.json({ error: 'Your invitation privileges are not suspended.' }, { status: 400 });
    }

    // 1. Log appeal to operatorQueue
    await adminDb.collection('operatorQueue').add({
      type: 'APPEAL_REQUEST',
      userId: uid,
      details: `Lead Investor requested appeal for invitation suspension. Reason: ${reason || 'No details provided.'}`,
      createdAt: new Date(),
      resolved: false,
    });

    // 2. Update user profile to track appeal status
    await userRef.update({
      appealSubmitted: true,
      appealReason: reason || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Your appeal has been submitted successfully. Our safety team will review it within 24 hours.',
    });
  } catch (err: any) {
    console.error('[Appeal Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
