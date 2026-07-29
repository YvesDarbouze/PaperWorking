import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { mergeIdentityHistory } from '@/lib/firebase/identityMerge';
import { telemetry } from '@/lib/telemetry';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required.' }, { status: 400 });
    }

    let invitedEmail = '';
    let inviteDocRef: any = null;

    // 1. Search dealInvitations
    const dealInvSnap = await adminDb.collection('dealInvitations')
      .where('token', '==', token)
      .limit(1)
      .get();
    if (!dealInvSnap.empty) {
      const dealInv = dealInvSnap.docs[0].data();
      invitedEmail = dealInv.inviteeEmail;
      inviteDocRef = dealInvSnap.docs[0].ref;
    } else {
      // 2. Search teamInvitations
      const teamInvSnap = await adminDb.collection('teamInvitations')
        .where('token', '==', token)
        .limit(1)
        .get();
      if (!teamInvSnap.empty) {
        const teamInv = teamInvSnap.docs[0].data();
        invitedEmail = teamInv.email;
        inviteDocRef = teamInvSnap.docs[0].ref;
      }
    }

    if (!invitedEmail) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const emailLower = invitedEmail.toLowerCase().trim();

    // 3. Perform merge (token anchors identity, so no verification is needed)
    const userDisplayName = auth.token.name || '';
    await mergeIdentityHistory(uid, emailLower, userDisplayName);

    // 4. Update the invitation record
    if (inviteDocRef) {
      await inviteDocRef.update({
        inviteeUid: uid,
        ...(userDisplayName ? { inviteeName: userDisplayName } : {}),
      });
    }

    // 5. Update user document claimedEmails array
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.update({
      claimedEmails: admin.firestore.FieldValue.arrayUnion(emailLower),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. Telemetry event
    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'identity_history_bound_via_token',
        properties: {
          claimedEmail: emailLower,
          token,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (telemetryErr) {
      console.error('[Claim/BindToken] Telemetry failed:', telemetryErr);
    }

    return NextResponse.json({
      success: true,
      message: `History for ${emailLower} has been bound successfully.`,
    });
  } catch (err: any) {
    console.error('[Claim/BindToken Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
