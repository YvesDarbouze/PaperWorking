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
    const { claimEmail, code } = body;

    if (!claimEmail || !code) {
      return NextResponse.json({ error: 'claimEmail and code are required.' }, { status: 400 });
    }

    const emailLower = claimEmail.toLowerCase().trim();
    const docId = `${uid}_${emailLower}`;
    const claimRef = adminDb.collection('identityVerificationClaims').doc(docId);
    const claimSnap = await claimRef.get();

    if (!claimSnap.exists) {
      return NextResponse.json({ error: 'Verification code not found or expired.' }, { status: 400 });
    }

    const claim = claimSnap.data()!;
    if (claim.code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    const expiresAt = claim.expiresAt?.toDate ? claim.expiresAt.toDate() : new Date(claim.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired.' }, { status: 400 });
    }

    if (claim.verified) {
      return NextResponse.json({ error: 'This email has already been verified.' }, { status: 400 });
    }

    // 1. Mark verified
    await claimRef.update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Perform merge
    const userDisplayName = auth.token.name || '';
    await mergeIdentityHistory(uid, emailLower, userDisplayName);

    // 3. Update user document claimedEmails array
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.update({
      claimedEmails: admin.firestore.FieldValue.arrayUnion(emailLower),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Telemetry event
    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'identity_history_claimed',
        properties: {
          claimedEmail: emailLower,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (telemetryErr) {
      console.error('[Claim/Verify] Telemetry failed:', telemetryErr);
    }

    return NextResponse.json({
      success: true,
      message: `History for ${emailLower} has been successfully merged.`,
    });
  } catch (err: any) {
    console.error('[Claim/Verify Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
