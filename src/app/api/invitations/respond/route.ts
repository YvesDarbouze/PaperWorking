import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { getEmailProvider } from '@/lib/email/getEmailProvider';
import { generateInvestorResponseEmail } from '@/lib/emails/templates/InvestorResponseEmail';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';
import { syncFractionalInvestorFromCommitment, removeFractionalInvestorForCommitment } from '@/lib/firebase/syncFractionalInvestors';
import { checkRateLimit, rateLimitResponse } from '@/lib/places/placesRateLimit';

/* ═══════════════════════════════════════════════════════════════
   POST /api/invitations/respond

   Unauthenticated (investor-facing) — token is the credential.

   Body: {
     token:            string             // URL-safe token from invite link
     action:           'accept'|'decline'|'interested'|'reopen'
     signatureDataUrl?: string            // required for accept
     disclosedCard?:   object             // optional for interested
   }

   Flow:
     1. Resolve invitation by token
     2. Validate: not expired, status in [pending, active]
     3. Write status update via Admin SDK (atomic, bypasses client rules)
     4. Notify deal owner + invitedBy via SendGrid
     5. Append audit log entry
   ═══════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';

interface RespondBody {
  token: string;
  action: 'accept' | 'decline' | 'interested' | 'reopen';
  signatureDataUrl?: string;
  declineReason?: string;
  disclosedCard?: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RespondBody = await request.json();
    const { token, action, signatureDataUrl } = body;

    // ── Input validation ────────────────────────────────────
    if (!token || typeof token !== 'string' || token.length < 16) {
      return NextResponse.json({ error: 'Invalid or missing invitation token.' }, { status: 400 });
    }
    if (action !== 'accept' && action !== 'decline' && action !== 'interested' && action !== 'reopen') {
      return NextResponse.json({ error: 'action must be "accept", "decline", "interested", or "reopen".' }, { status: 400 });
    }
    if (action === 'accept' && !signatureDataUrl) {
      return NextResponse.json({ error: 'signatureDataUrl is required when accepting.' }, { status: 400 });
    }

    // ── Rate Limiting ────────────────────────────────────────
    const rateCheck = await checkRateLimit(token, 'cardExchange');
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck);
    }

    // ── Resolve invitation from both collections ──────────────
    let isDealInvitation = false;
    let snap = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .limit(1)
      .get();

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
          proposedAmount: rawInv.proposedAmount || 0,
          proposedEquityPercent: rawInv.proposedEquityPercent || 0,
          createdAt: rawInv.createdAt,
          expiresAt: rawInv.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          version: rawInv.version || 1,
          visibilityMode: rawInv.visibilityMode || 'PRIVATE',
          listingId: rawInv.listingId || '',
        }
      : rawInv;

    // ── Guard: expiry ───────────────────────────────────────
    const expiresAt: Date = inv.expiresAt?.toDate
      ? inv.expiresAt.toDate()
      : new Date(inv.expiresAt);

    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation link has expired.' }, { status: 410 });
    }

    // ── Guard: Reversibility / Lock status ───────────────────
    const emailLower = inv.email.toLowerCase();
    const commitmentsSnap = await adminDb
      .collection('projects')
      .doc(inv.projectId)
      .collection('commitments')
      .where('email', '==', emailLower)
      .get();

    let isLocked = false;
    for (const doc of commitmentsSnap.docs) {
      const cStatus = doc.data().status;
      if (['signed', 'funds-confirmed', 'cleared'].includes(cStatus)) {
        isLocked = true;
        break;
      }
    }

    if (isLocked) {
      return NextResponse.json({ error: 'Cannot change response: The Lead Investor has already acted on this commitment.' }, { status: 403 });
    }

    // ── Tear down unconfirmed pledged commitments on decline/reopen ──
    if (action === 'decline' || action === 'reopen') {
      for (const doc of commitmentsSnap.docs) {
        if (doc.data().status === 'pledged') {
          await doc.ref.delete();
          await removeFractionalInvestorForCommitment(inv.projectId, doc.id);
        }
      }
    }

    // ── Write to Firestore (Admin SDK) ──────────────────────
    const now = FieldValue.serverTimestamp();
    let update: Record<string, unknown> = {};

    if (action === 'accept') {
      update = { status: 'accepted', acceptedAt: now, signatureDataUrl };
    } else if (action === 'decline') {
      update = { status: 'declined', declinedAt: now, declineReason: body.declineReason || null };
    } else if (action === 'interested') {
      const disclosedCard = body.disclosedCard || {
        name: inv.name || 'Anonymous Investor',
        email: inv.email || '',
        phone: '',
        company: '',
      };
      update = {
        status: 'interested',
        interestedAt: now,
        inviteeBusinessCard: disclosedCard,
        cardExchangeStatus: 'pending',
      };
    } else if (action === 'reopen') {
      update = { status: 'opened', reopenedAt: now };
    }

    await invRef.update(update);

    // ── Create commitment on acceptance ─────────────────────
    if (action === 'accept') {
      const commitmentRef = adminDb
        .collection('projects')
        .doc(inv.projectId)
        .collection('commitments')
        .doc();

      const amountCents = Math.round((inv.proposedAmount || 0) * 100);
      const commitmentName = inv.name || 'Anonymous Investor';

      await commitmentRef.set({
        projectId: inv.projectId,
        name: commitmentName,
        amountCents,
        status: 'pledged',
        email: inv.email || null,
        notes: 'Crowdfund invitation accepted via Inbox',
        createdByUid: inv.invitedByUid || 'system',
        createdAt: now,
        updatedAt: now,
      });

      // Keep fractional investors view in sync
      await syncFractionalInvestorFromCommitment(inv.projectId, {
        id: commitmentRef.id,
        name: commitmentName,
        email: inv.email || null,
        amountCents,
        status: 'pledged',
      });
    }

    // ── Notify deal owner ───────────────────────────────────
    const [projectSnap, ownerSnap] = await Promise.all([
      adminDb.collection('projects').doc(inv.projectId).get(),
      inv.invitedByUid !== 'system'
        ? adminDb.collection('users').doc(inv.invitedByUid).get()
        : Promise.resolve(null),
    ]);

    const dealName = projectSnap.data()?.propertyName ?? inv.dealName ?? 'Untitled Deal';
    const ownerEmail: string | null = ownerSnap?.data()?.email ?? null;

    if (ownerEmail && action !== 'reopen') {
      const { subject, html, text } = generateInvestorResponseEmail({
        action: action === 'accept' ? 'accepted' : (action === 'interested' ? 'interested' : 'declined'),
        investorName: inv.name,
        investorEmail: inv.email,
        projectName: dealName,
        projectId: inv.projectId,
        proposedEquityPercent: inv.proposedEquityPercent ?? 0,
        proposedAmount: inv.proposedAmount ?? 0,
        appUrl: APP_URL,
      });

      const emailProvider = getEmailProvider();
      await emailProvider.sendEmail({
        from: 'notifications@mail.paperworking.co',
        replyTo: inv.email || 'hi@paperworking.co',
        to: [ownerEmail],
        subject,
        templateKey: action === 'accept' ? 'DEAL-MKT-DEAL-UPDATE' : 'DEAL-MKT-RESPONSE',
        messageClass: 'O',
        html,
        text,
      });
    }

    // ── Write to dealLedger timeline ────────────────────────
    const ledgerRef = adminDb.collection('projects').doc(inv.projectId)
      .collection('dealLedger').doc();
    await ledgerRef.set({
      id: ledgerRef.id,
      projectId: inv.projectId,
      listingId: inv.listingId || '',
      eventType: 'INVITATION_RESPONSE',
      performedBy: inv.invitedByUid || 'system',
      inviteeEmail: emailLower,
      version: inv.version || 1,
      visibilityMode: inv.visibilityMode || 'PRIVATE',
      timestamp: new Date().toISOString(),
      metadata: {
        invitationId: invRef.id,
        status: action === 'reopen' ? 'opened' : (action === 'accept' ? 'accepted' : action),
        declineReason: body.declineReason || null,
      },
    });

    const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
    let timelineType: any = null;
    const timelineMeta: any = { inviteeEmail: emailLower };
    if (action === 'accept') {
      timelineType = 'interest';
      timelineMeta.status = 'accepted';
    } else if (action === 'decline') {
      timelineType = 'decline';
      timelineMeta.declineReason = body.declineReason || null;
    } else if (action === 'interested') {
      timelineType = 'interest';
      timelineMeta.cardExchangeStatus = 'pending';
    }
    if (timelineType) {
      await trackDealActivity(
        inv.projectId,
        inv.projectId,
        inv.invitedByUid || 'system',
        timelineType,
        timelineMeta
      ).catch((e: any) => console.error('Failed to log respond timeline event:', e));
    }

    // ── Telemetry Taxonomy tracking ─────────────────────────
    try {
      const { trackEvent } = require('@/actions/telemetry');
      if (action === 'accept' || action === 'decline') {
        await trackEvent('deal_terms_responded', {
          listingId: inv.listingId || '',
          projectId: inv.projectId,
          isCounter: false,
          amountCents: inv.investmentAmount ? Math.round(inv.investmentAmount * 100) : 0,
        }, token);
      } else if (action === 'interested') {
        await trackEvent('contact_details_exchanged', {
          listingId: inv.listingId || null,
          projectId: inv.projectId,
          recipientUid: inv.invitedByUid || null,
        }, token);
      }
    } catch (e) {
      console.error('Failed to log respond taxonomy event:', e);
    }

    // ── Audit log ───────────────────────────────────────────
    await adminDb.collection('auditLog').add({
      type: `invitation_${action}ed`,
      invitationId: invRef.id,
      projectId: inv.projectId,
      organizationId: inv.organizationId || null,
      investorEmail: inv.email,
      investorName: inv.name,
      at: now,
    });

    // ── Org activity feed (non-blocking) ────────────────────
    if (action === 'accept' && inv.organizationId) {
      logOrgActivity({
        organizationId: inv.organizationId,
        type: 'member_joined',
        actorId: inv.invitedByUid || 'system',
        actorName: inv.name || 'An investor',
        summary: `${inv.name || 'An investor'} accepted the investment invitation for ${dealName}`,
        projectId: inv.projectId,
        projectName: dealName,
      });
    }

    return NextResponse.json({ success: true, action, invitationId: invRef.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Invitations/Respond] Error:', msg);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
