import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Transactional Email API — Resend-native, falls back to audit-log when key absent.
 *
 * POST /api/emails/send
 * Body: {
 *   idToken: string
 *   projectId: string
 *   to: string[]           // recipient email addresses
 *   subject: string
 *   html: string           // HTML body
 *   text?: string          // plain-text fallback
 *   replyTo?: string       // optional reply-to address
 *   tags?: { name: string; value: string }[]
 * }
 *
 * To enable Resend, set: RESEND_API_KEY and RESEND_FROM_EMAIL in your env.
 * The reply-to address should be: reply+{projectId}@your-inbound-domain.com
 * so incoming replies are routed back through /api/webhooks/emails.
 */

interface SendEmailBody {
  idToken: string;
  projectId: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

async function sendViaResend(payload: Omit<SendEmailBody, 'idToken' | 'projectId'>): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paperworking.io';

  if (!apiKey) {
    // Return a mock ID so the rest of the handler still persists the audit log
    return { id: `mock_${Date.now().toString(36)}` };
  }

  const body = {
    from: fromEmail,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    ...(payload.text && { text: payload.text }),
    ...(payload.replyTo && { reply_to: payload.replyTo }),
    ...(payload.tags && { tags: payload.tags }),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailBody = await request.json();
    const { idToken, projectId, to, subject, html, text, replyTo, tags } = body;

    // ── Validation ─────────────────────────────────────────
    if (!idToken || !projectId || !to?.length || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, projectId, to, subject, html' },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const [dealSnap, userSnap] = await Promise.all([
      adminDb.collection('projects').doc(projectId).get(),
      adminDb.collection('users').doc(uid).get(),
    ]);

    if (!dealSnap.exists) return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    if (!userSnap.exists)  return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const dealData = dealSnap.data()!;
    const userData = userSnap.data()!;

    if (dealData.organizationId !== userData.organizationId) {
      return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    // ── Inject tracking token into subject so inbound replies route back ──
    const trackingSubject = `${subject} [ref:deal_${projectId}]`;

    // ── Build default reply-to if not provided ──────────────
    const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN;
    const effectiveReplyTo = replyTo
      || (inboundDomain ? `reply+${projectId}@${inboundDomain}` : undefined);

    // ── Dispatch ────────────────────────────────────────────
    const result = await sendViaResend({
      to,
      subject: trackingSubject,
      html,
      text,
      replyTo: effectiveReplyTo,
      tags,
    });

    const isMock = !process.env.RESEND_API_KEY;

    // ── Firestore audit log ─────────────────────────────────
    await adminDb.collection('projects').doc(projectId)
      .collection('messages')
      .add({
        senderEmail: process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.io',
        senderName: 'PaperWorking',
        body: text || html.replace(/<[^>]+>/g, ''),
        subject: trackingSubject,
        type: 'EMAIL_OUTBOUND',
        recipients: to,
        providerMessageId: result.id,
        projectId,
        organizationId: dealData.organizationId,
        mock: isMock,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      messageId: result.id,
      mock: isMock,
      ...(isMock && { message: 'Email mocked — set RESEND_API_KEY to enable live delivery.' }),
    });
  } catch (error: any) {
    console.error('[Email Send] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to send email.', details: error.message }, { status: 500 });
  }
}
