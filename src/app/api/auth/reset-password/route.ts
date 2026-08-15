import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getEmailProvider } from '@/lib/email/getEmailProvider';
import { renderAcctPasswordReset } from '@/lib/email/templateRegistry';
import { MONITORED_SUPPORT_EMAIL } from '@/lib/email/envelopeContract';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';

/**
 * POST /api/auth/reset-password (EM Series v2 · EM-12 · F-18, F-20)
 *
 * Public endpoint for password reset requests:
 * - Generates secure link via Firebase Admin SDK
 * - Renders branded template via canonical template registry
 * - Dispatches through SendGrid Email Adapter
 * - Silent enumeration protection (F-20): Always returns 200 OK regardless of account existence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email: string | undefined = body?.email?.trim?.()?.toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // Attempt to generate password reset link via Firebase Admin SDK
    try {
      const actionCodeSettings = {
        url: `${APP_URL}/auth/action?mode=resetPassword`,
        handleCodeInApp: true,
      };

      const resetLink = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
      
      // Look up user display name if available
      let displayName: string | undefined;
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        displayName = userRecord.displayName || undefined;
      } catch {
        // Ignore user lookup error
      }

      // Render canonical ACCT-PASSWORD-RESET template
      const rendered = renderAcctPasswordReset({ resetLink, displayName });
      const emailProvider = getEmailProvider();

      await emailProvider.sendEmail({
        from: rendered.sender.email,
        replyTo: MONITORED_SUPPORT_EMAIL,
        to: [email],
        subject: rendered.subject,
        templateKey: rendered.templateKey,
        messageClass: rendered.messageClass,
        html: rendered.html,
        text: rendered.text,
      });
    } catch (authError: unknown) {
      const authCode =
        typeof authError === 'object' && authError !== null && 'code' in authError
          ? String((authError as { code?: string }).code)
          : undefined;
      // If user does not exist (auth/user-not-found), do not leak information (F-20)
      if (authCode !== 'auth/user-not-found') {
        console.error('[ResetPassword] Non-fatal adminAuth error:', authError);
      }
    }

    // F-20: Silent enumeration protection
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ResetPassword] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
