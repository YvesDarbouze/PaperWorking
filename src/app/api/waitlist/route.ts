import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

/* ═══════════════════════════════════════════════════════
   POST /api/waitlist

   Public (unauthenticated). Accepts a lead email address,
   deduplicates against existing waitlist entries, persists
   to Firestore, and sends a confirmation email via Resend.

   Body: { email: string }

   Responses:
     201  — new entry created
     200  — already on waitlist (idempotent)
     400  — missing or invalid email
     500  — internal error
   ═══════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email: string | undefined = body?.email?.trim?.();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Deduplicate — check if already on the waitlist
    const existing = await adminDb
      .collection('waitlist')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ success: true, alreadyJoined: true }, { status: 200 });
    }

    // Persist to Firestore
    await adminDb.collection('waitlist').add({
      email: normalizedEmail,
      joinedAt: FieldValue.serverTimestamp(),
      source: request.headers.get('referer') || 'direct',
      userAgent: request.headers.get('user-agent') || null,
    });

    // Confirmation email to the submitter
    if (resend) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [normalizedEmail],
        subject: "You're on the PaperWorking waitlist",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#ffffff;">
            <p style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#7F7F7F;margin:0 0 32px 0;">
              PaperWorking
            </p>
            <h1 style="font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 12px 0;letter-spacing:-0.02em;">
              You're in line.
            </h1>
            <p style="font-size:14px;color:#7F7F7F;line-height:1.6;margin:0 0 24px 0;">
              We received your request for early access to PaperWorking.
              Early members receive a 30-day extended trial and priority onboarding.
              We'll reach out as soon as your spot opens.
            </p>
            <a href="${APP_URL}"
               style="display:inline-block;background:#0d0d0d;color:#ffffff;text-decoration:none;padding:12px 24px;font-weight:600;font-size:13px;letter-spacing:0.04em;">
              Visit PaperWorking
            </a>
            <p style="font-size:11px;color:#A5A5A5;margin:32px 0 0 0;">
              You're receiving this because you signed up at paperworking.co.
            </p>
          </div>
        `,
        text: [
          "You're on the PaperWorking waitlist.",
          '',
          "We received your request for early access. Early members receive a 30-day extended trial and priority onboarding. We'll reach out as soon as your spot opens.",
          '',
          `Visit: ${APP_URL}`,
        ].join('\n'),
      });
    }

    return NextResponse.json({ success: true, alreadyJoined: false }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Waitlist] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
