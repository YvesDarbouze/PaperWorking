import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getEmailProvider } from '@/lib/email/getEmailProvider';
import { renderEmailLayout, htmlToPlainText } from '@/lib/emails/templates/BaseLayout';
import { SENDER_IDENTITIES, MONITORED_SUPPORT_EMAIL } from '@/lib/email/envelopeContract';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';

/**
 * POST /api/auth/magic-link (EM Series v2 · EM-12 · F-18, F-20)
 *
 * Public endpoint for passwordless email sign-in:
 * - Generates secure link via Firebase Admin SDK
 * - Renders branded template via canonical template registry
 * - Dispatches through SendGrid Email Adapter
 * - Silent enumeration protection (F-20)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email: string | undefined = body?.email?.trim?.()?.toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    try {
      const actionCodeSettings = {
        url: `${APP_URL}/login/finish`,
        handleCodeInApp: true,
      };

      const magicLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

      const subject = 'Sign in to PaperWorking';
      const bodyHtml = `
        <h1 style="font-size:22px;font-weight:700;color:#0D0D12;margin:0 0 16px 0;letter-spacing:-0.02em;">Sign in to PaperWorking</h1>
        <p style="font-size:14px;color:#454955;line-height:1.6;margin:0 0 20px 0;">
          Click the button below to instantly sign in to your PaperWorking account.
        </p>
        <div style="margin:28px 0;">
          <a href="${magicLink}" class="btn-primary">Sign in to PaperWorking &rarr;</a>
        </div>
        <p style="font-size:12px;color:#8E909B;line-height:1.5;margin:24px 0 0 0;">
          This link can only be used once. If you did not request this email, no action is needed.
        </p>
      `;

      const html = renderEmailLayout({
        title: 'Sign In',
        preheader: 'Your single-use sign-in link.',
        bodyHtml,
        messageClass: 'E',
      });

      const emailProvider = getEmailProvider();
      await emailProvider.sendEmail({
        from: SENDER_IDENTITIES.security.email,
        replyTo: MONITORED_SUPPORT_EMAIL,
        to: [email],
        subject,
        templateKey: 'ACCT-MAGIC-LINK',
        messageClass: 'E',
        html,
        text: htmlToPlainText(html),
      });
    } catch (authError: any) {
      console.error('[MagicLink] Non-fatal adminAuth error:', authError);
    }

    return NextResponse.json({
      success: true,
      message: 'A sign-in link has been sent to your email address.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[MagicLink] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
