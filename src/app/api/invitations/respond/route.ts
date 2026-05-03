import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Resend } from 'resend';
import { generateInvestorResponseEmail } from '@/lib/emails/templates/InvestorResponseEmail';

/* ═══════════════════════════════════════════════════════════════
   POST /api/invitations/respond

   Unauthenticated (investor-facing) — token is the credential.

   Body: {
     token:            string             // URL-safe token from invite link
     action:           'accept'|'decline'
     signatureDataUrl?: string            // required for accept
   }

   Flow:
     1. Resolve invitation by token
     2. Validate: not expired, status in [pending, active]
     3. Write status update via Admin SDK (atomic, bypasses client rules)
     4. Notify deal owner + invitedBy via Resend
     5. Append audit log entry
   ═══════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@paperworking.co';

interface RespondBody {
  token: string;
  action: 'accept' | 'decline';
  signatureDataUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RespondBody = await request.json();
    const { token, action, signatureDataUrl } = body;

    // ── Input validation ────────────────────────────────────
    if (!token || typeof token !== 'string' || token.length < 16) {
      return NextResponse.json({ error: 'Invalid or missing invitation token.' }, { status: 400 });
    }
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'action must be "accept" or "decline".' }, { status: 400 });
    }
    if (action === 'accept' && !signatureDataUrl) {
      return NextResponse.json({ error: 'signatureDataUrl is required when accepting.' }, { status: 400 });
    }

    // ── Resolve invitation ──────────────────────────────────
    const snap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invRef = snap.docs[0].ref;
    const inv = snap.docs[0].data();

    // ── Guard: status ───────────────────────────────────────
    if (!['pending', 'active'].includes(inv.status)) {
      return NextResponse.json(
        { error: `Invitation has already been ${inv.status}.` },
        { status: 409 },
      );
    }

    // ── Guard: expiry ───────────────────────────────────────
    const expiresAt: Date = inv.expiresAt?.toDate
      ? inv.expiresAt.toDate()
      : new Date(inv.expiresAt);

    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation link has expired.' }, { status: 410 });
    }

    // ── Write to Firestore (Admin SDK) ──────────────────────
    const now = FieldValue.serverTimestamp();
    const update: Record<string, unknown> =
      action === 'accept'
        ? { status: 'accepted', acceptedAt: now, signatureDataUrl }
        : { status: 'declined', declinedAt: now };

    await invRef.update(update);

    // ── Notify deal owner ───────────────────────────────────
    const [projectSnap, ownerSnap] = await Promise.all([
      adminDb.collection('projects').doc(inv.projectId).get(),
      inv.invitedByUid !== 'system'
        ? adminDb.collection('users').doc(inv.invitedByUid).get()
        : Promise.resolve(null),
    ]);

    const dealName = projectSnap.data()?.propertyName ?? inv.dealName ?? 'Untitled Deal';
    const ownerEmail: string | null = ownerSnap?.data()?.email ?? null;

    if (resend && ownerEmail) {
      const { subject, html, text } = generateInvestorResponseEmail({
        action: action === 'accept' ? 'accepted' : 'declined',
        investorName: inv.name,
        investorEmail: inv.email,
        projectName: dealName,
        projectId: inv.projectId,
        proposedEquityPercent: inv.proposedEquityPercent ?? 0,
        proposedAmount: inv.proposedAmount ?? 0,
        appUrl: APP_URL,
      });

      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ownerEmail],
        subject,
        html,
        text,
      });
    }

    // ── Audit log ───────────────────────────────────────────
    await adminDb.collection('auditLog').add({
      type: `invitation_${action}ed`,
      invitationId: invRef.id,
      projectId: inv.projectId,
      organizationId: inv.organizationId,
      investorEmail: inv.email,
      investorName: inv.name,
      at: now,
    });

    return NextResponse.json({ success: true, action, invitationId: invRef.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Invitations/Respond] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
