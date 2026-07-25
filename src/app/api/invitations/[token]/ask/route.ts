import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Resend } from 'resend';
import { generateInvestorInquiryEmail } from '@/lib/emails/templates/InvestorInquiryEmail';

/* ═══════════════════════════════════════════════════════════════
   POST /api/invitations/[token]/ask

   Unauthenticated (investor-facing) — token is the credential,
   same trust model as /api/invitations/respond.

   Body: { message: string }

   Persists a real investor inquiry (projects/{id}/investorInquiries)
   and emails the deal owner — replaces the client-timer fake
   "Ask Sponsor" behavior on the Guest Portal.
   ═══════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';
const MAX_INQUIRIES_PER_INVITATION = 5;
const MAX_MESSAGE_LENGTH = 2000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    if (!token || typeof token !== 'string' || token.length < 16) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const body = await request.json();
    const message: string = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, { status: 400 });
    }

    // ── Resolve invitation ──────────────────────────────────
    let snap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    let isDealInvitation = false;
    if (snap.empty) {
      snap = await adminDb
        .collection('dealInvitations')
        .where('token', '==', token)
        .limit(1)
        .get();
      if (!snap.empty) {
        isDealInvitation = true;
      }
    }

    if (snap.empty) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invRef = snap.docs[0].ref;
    const rawInv = snap.docs[0].data();
    const inv = isDealInvitation
      ? {
          id: rawInv.id,
          token: rawInv.token,
          email: rawInv.inviteeEmail,
          name: rawInv.inviteeName || 'Anonymous Investor',
          projectId: rawInv.projectId,
          invitedByUid: rawInv.inviterUid || 'system',
          status: rawInv.status,
          createdAt: rawInv.createdAt,
          expiresAt: rawInv.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          version: rawInv.version || 1,
          visibilityMode: rawInv.visibilityMode || 'PRIVATE',
          listingId: rawInv.listingId || '',
        }
      : rawInv;

    const expiresAt: Date = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation link has expired.' }, { status: 410 });
    }

    const existingSnap = await adminDb
      .collection('projects')
      .doc(inv.projectId)
      .collection('investorInquiries')
      .where('invitationId', '==', invRef.id)
      .get();

    // ── Thread creation or message append ───────────────────
    const now = FieldValue.serverTimestamp();
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'investor',
      text: message,
      createdAt: new Date().toISOString(),
    };

    if (!existingSnap.empty) {
      const threadDoc = existingSnap.docs[0];
      const data = threadDoc.data();
      const messagesList = data.messages || [];

      // Check if thread has too many messages
      if (messagesList.length >= 20) {
        return NextResponse.json(
          { error: 'Message thread limit reached. Please wait for a response or contact support.' },
          { status: 429 }
        );
      }

      await threadDoc.ref.update({
        messages: FieldValue.arrayUnion(newMessage),
        status: 'open',
        updatedAt: now,
      });
    } else {
      await adminDb
        .collection('projects')
        .doc(inv.projectId)
        .collection('investorInquiries')
        .add({
          projectId: inv.projectId,
          invitationId: invRef.id,
          investorName: inv.name || 'Anonymous Investor',
          investorEmail: inv.email || null,
          message, // keep for backward compatibility
          status: 'open',
          isShared: false,
          messages: [newMessage],
          createdAt: now,
          updatedAt: now,
        });
    }

    // ── Write to dealLedger ──────────────────────────────────
    const ledgerRef = adminDb.collection('projects').doc(inv.projectId)
      .collection('dealLedger').doc();
    await ledgerRef.set({
      id: ledgerRef.id,
      projectId: inv.projectId,
      listingId: inv.listingId || '',
      eventType: 'INVITATION_RESPONSE',
      performedBy: inv.invitedByUid || 'system',
      inviteeEmail: inv.email || 'unknown',
      version: inv.version || 1,
      visibilityMode: inv.visibilityMode || 'PRIVATE',
      timestamp: new Date().toISOString(),
      metadata: {
        invitationId: invRef.id,
        status: 'question',
        question: message,
      },
    });

    // ── Track timeline activity ─────────────────────────────
    const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
    await trackDealActivity(
      inv.projectId,
      inv.projectId,
      inv.invitedByUid || 'system',
      'question',
      {
        inviteeEmail: inv.email,
        questionText: message,
      }
    ).catch((e: any) => console.error('Failed to log question event:', e));

    // ── Notify the deal owner ───────────────────────────────
    const [projectSnap, ownerSnap] = await Promise.all([
      adminDb.collection('projects').doc(inv.projectId).get(),
      inv.invitedByUid && inv.invitedByUid !== 'system'
        ? adminDb.collection('users').doc(inv.invitedByUid).get()
        : Promise.resolve(null),
    ]);

    const dealName = projectSnap.data()?.propertyName ?? inv.dealName ?? 'Untitled Deal';
    const ownerEmail: string | null = ownerSnap?.data()?.email ?? null;

    if (resend && ownerEmail) {
      const { subject, html, text } = generateInvestorInquiryEmail({
        investorName: inv.name || 'Anonymous Investor',
        investorEmail: inv.email || 'unknown',
        projectName: dealName,
        projectId: inv.projectId,
        message,
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ownerEmail],
        replyTo: inv.email || undefined,
        subject,
        html,
        text,
      });
    }

    // ── Audit log ────────────────────────────────────────────
    await adminDb.collection('auditLog').add({
      type: 'investor_inquiry',
      invitationId: invRef.id,
      projectId: inv.projectId,
      investorEmail: inv.email,
      investorName: inv.name,
      at: now,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Invitations/Ask] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
