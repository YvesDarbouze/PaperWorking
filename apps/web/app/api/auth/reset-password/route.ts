import { NextResponse } from 'next/server';
import { handleAuthResetPasswordPost } from '@paperworking/api';
import { sendGridService } from '@/lib/email/sendgrid-service';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';

    const result = await handleAuthResetPasswordPost(body, {
      appUrl,
      sendPasswordReset: async ({ email, appUrl: targetAppUrl }) => {
        // Generate cryptographic reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetUrl = `${targetAppUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        await sendGridService.send({
          to: email,
          subject: 'Reset your PaperWorking password',
          text: `Reset your PaperWorking password (expires in 60 minutes): ${resetUrl}`,
          html: `<p>We received a request to reset your PaperWorking password.</p><p><a href="${resetUrl}">Reset password</a> (expires in 60 minutes).</p><p>If you did not request this, you can ignore this email.</p>`,
        });
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[POST /api/auth/reset-password] Error:', message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
