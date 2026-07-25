import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const body = await request.json();
    const { claimEmail } = body;

    if (!claimEmail || typeof claimEmail !== 'string') {
      return NextResponse.json({ error: 'claimEmail is required.' }, { status: 400 });
    }

    const emailLower = claimEmail.toLowerCase().trim();

    if (auth.token.email?.toLowerCase() === emailLower) {
      return NextResponse.json({ error: 'You cannot claim your own primary email.' }, { status: 400 });
    }

    // 1. Verify history exists in the database
    const [dealInv, teamInv, contacts, commitments] = await Promise.all([
      adminDb.collection('dealInvitations').where('inviteeEmail', '==', emailLower).limit(1).get(),
      adminDb.collection('teamInvitations').where('email', '==', emailLower).limit(1).get(),
      adminDb.collectionGroup('investor_contacts').where('email', '==', emailLower).limit(1).get(),
      adminDb.collectionGroup('commitments').where('email', '==', emailLower).limit(1).get(),
    ]);

    const hasHistory = !dealInv.empty || !teamInv.empty || !contacts.empty || !commitments.empty;
    if (!hasHistory) {
      return NextResponse.json({ error: 'No prior history found for this email address.' }, { status: 400 });
    }

    // 2. Generate secure 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store code in identityVerificationClaims
    const docId = `${uid}_${emailLower}`;
    await adminDb.collection('identityVerificationClaims').doc(docId).set({
      userId: uid,
      claimEmail: emailLower,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      verified: false,
      createdAt: new Date(),
    });

    // 4. Send email
    const subject = 'Your PaperWorking Verification Code';
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2>Verify your email to claim your PaperWorking history</h2>
        <p>You requested to claim the history of <strong>${emailLower}</strong> and merge it with your account.</p>
        <p>Please enter the following 6-digit verification code in your settings panel:</p>
        <div style="background: #f4f4f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #666;">This code will expire in 15 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `;

    await CommunicationEngine.sendRawEmail([emailLower], subject, emailHtml);

    return NextResponse.json({ success: true, message: 'Verification code sent.' });
  } catch (err: any) {
    console.error('[Claim/Start Error]', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
