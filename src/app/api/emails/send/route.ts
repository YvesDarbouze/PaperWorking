import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';

/**
 * Transactional Email API — Unified via CommunicationEngine
 *
 * POST /api/emails/send
 * Body: {
 *   idToken: string
 *   projectId: string
 *   to: string[]           // recipient email addresses
 *   subject: string
 *   html: string           // HTML body
 *   text?: string          // plain-text fallback
 * }
 *
 * All dispatch, audit logging, and delivery tracking is handled by
 * the CommunicationEngine module. The route only handles auth validation
 * and cross-tenant security checks.
 */

interface SendEmailBody {
  idToken: string;
  projectId: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailBody = await request.json();
    const { idToken, projectId, to, subject, html, text } = body;

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
    if (!userSnap.exists) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const dealData = dealSnap.data()!;
    const userData = userSnap.data()!;

    if (dealData.organizationId !== userData.organizationId) {
      return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    // ── Dispatch via CommunicationEngine ────────────────────
    const result = await CommunicationEngine.sendCustomEmail({
      senderUid: uid,
      projectId,
      to,
      subject,
      html,
      text,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      mock: result.mock,
      recipientCount: result.recipientCount,
      ...(result.mock && { message: 'Email mocked — set RESEND_API_KEY to enable live delivery.' }),
    });
  } catch (error: any) {
    console.error('[Email Send] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to send email.', details: error.message },
      { status: 500 },
    );
  }
}
