import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════
   POST /api/inbox/backfill

   One-time admin-gated route to backfill inbox items
   from existing pending invitations. Creates an
   `inboxItem` for each invitation that has a matching
   user account.
   ═══════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  try {
    // ── Auth gate (admin only) ─────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Verify caller is an org owner or platform admin
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!callerDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 403 });
    }

    const callerData = callerDoc.data();
    const isAdmin = callerData?.orgRole === 'Lead Investor' || callerData?.orgRole === 'Admin';
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only Lead Investors and Admins can run backfill' },
        { status: 403 },
      );
    }

    // ── Scan pending invitations ───────────────────
    const invitationsSnap = await adminDb
      .collection('invitations')
      .where('status', '==', 'pending')
      .get();

    let created = 0;
    let skipped = 0;

    for (const invDoc of invitationsSnap.docs) {
      const inv = invDoc.data();

      // Look up the invitee by email
      const userSnap = await adminDb
        .collection('users')
        .where('email', '==', (inv.email || '').trim().toLowerCase())
        .limit(1)
        .get();

      if (userSnap.empty) {
        skipped++;
        continue; // Invitee doesn't have an account yet
      }

      const inviteeDoc = userSnap.docs[0];
      const inviteeUid = inviteeDoc.id;

      // Check if an inbox item already exists for this invitation
      const existingSnap = await adminDb
        .collection('inboxItems')
        .where('recipientUid', '==', inviteeUid)
        .where('invitationId', '==', inv.token || invDoc.id)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        skipped++;
        continue; // Already backfilled
      }

      const itemId = `inb_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
      const senderName = inv.invitedByName || 'PaperWorking';

      await adminDb.collection('inboxItems').doc(itemId).set({
        id: itemId,
        recipientUid: inviteeUid,
        organizationId: inv.organizationId || inviteeDoc.data()?.organizationId || '',
        type: 'invitation',
        category: 'crowdfund_invite',
        title: `${senderName} invited you to invest in ${inv.projectName || inv.dealName || 'a project'}`,
        body: inv.proposedEquityPercent
          ? `You've been offered ${inv.proposedEquityPercent}% equity. Review and respond to this invitation.`
          : 'Review and respond to this investment invitation.',
        senderUid: inv.invitedByUid || null,
        senderName,
        senderAvatarInitial: senderName[0]?.toUpperCase() || 'P',
        projectId: inv.projectId || null,
        projectName: inv.projectName || inv.dealName || null,
        invitationId: inv.token || invDoc.id,
        actionUrl: '/dashboard/inbox',
        read: false,
        archived: false,
        createdAt: inv.createdAt?.toDate?.() || new Date(),
        ...(inv.expiresAt ? { expiresAt: inv.expiresAt.toDate?.() || new Date(inv.expiresAt) } : {}),
      });

      created++;
    }

    console.log(`[Backfill] Done. Created: ${created}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      created,
      skipped,
      totalInvitations: invitationsSnap.size,
    });
  } catch (error: any) {
    console.error('[Backfill] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
